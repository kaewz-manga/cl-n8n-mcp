import { usersRepository, User } from '../database/users-repository';
import { generateToken } from './auth-service';
import { logger } from '../../utils/logger';

// OAuth provider configurations
interface OAuthConfig {
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  scope: string;
}

interface OAuthUserProfile {
  id: string;
  email: string;
  name?: string;
}

// Env-based config for Workers, process.env fallback for Express
let _frontendUrl = 'http://localhost:5173';
let _githubConfig: { clientId?: string; clientSecret?: string; callbackUrl?: string } = {};
let _googleConfig: { clientId?: string; clientSecret?: string; callbackUrl?: string } = {};

export function configureOAuth(config: {
  frontendUrl?: string;
  github?: { clientId?: string; clientSecret?: string; callbackUrl?: string };
  google?: { clientId?: string; clientSecret?: string; callbackUrl?: string };
}): void {
  if (config.frontendUrl) _frontendUrl = config.frontendUrl;
  if (config.github) _githubConfig = config.github;
  if (config.google) _googleConfig = config.google;
}

// Initialize from process.env if available (Express mode)
try {
  if (typeof process !== 'undefined' && process.env) {
    _frontendUrl = process.env.FRONTEND_URL || _frontendUrl;
    _githubConfig = {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackUrl: process.env.GITHUB_CALLBACK_URL,
    };
    _googleConfig = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    };
  }
} catch { /* Workers mode - no process.env */ }

function getOAuthConfig(provider: 'github' | 'google'): OAuthConfig | null {
  if (provider === 'github') {
    const clientId = _githubConfig.clientId;
    const clientSecret = _githubConfig.clientSecret;
    if (!clientId || !clientSecret) return null;

    return {
      authorizeUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      userInfoUrl: 'https://api.github.com/user',
      clientId,
      clientSecret,
      callbackUrl: _githubConfig.callbackUrl || `${_frontendUrl}/oauth/callback`,
      scope: 'user:email',
    };
  }

  if (provider === 'google') {
    const clientId = _googleConfig.clientId;
    const clientSecret = _googleConfig.clientSecret;
    if (!clientId || !clientSecret) return null;

    return {
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
      clientId,
      clientSecret,
      callbackUrl: _googleConfig.callbackUrl || `${_frontendUrl}/oauth/callback`,
      scope: 'openid email profile',
    };
  }

  return null;
}

/**
 * Get the authorization URL to redirect the user to
 */
export function getAuthorizationUrl(provider: 'github' | 'google'): string | null {
  const config = getOAuthConfig(provider);
  if (!config) return null;

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.callbackUrl,
    scope: config.scope,
    state: provider,
  });

  if (provider === 'google') {
    params.set('response_type', 'code');
    params.set('access_type', 'offline');
  }

  return `${config.authorizeUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(provider: 'github' | 'google', code: string): Promise<string | null> {
  const config = getOAuthConfig(provider);
  if (!config) return null;

  const body: Record<string, string> = {
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.callbackUrl,
  };

  if (provider === 'github') {
    body.accept = 'json';
  }
  if (provider === 'google') {
    body.grant_type = 'authorization_code';
  }

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json() as { access_token?: string };
  return data.access_token || null;
}

/**
 * Fetch user profile from OAuth provider
 */
async function fetchUserProfile(provider: 'github' | 'google', accessToken: string): Promise<OAuthUserProfile | null> {
  const config = getOAuthConfig(provider);
  if (!config) return null;

  const response = await fetch(config.userInfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) return null;

  const data = await response.json() as Record<string, unknown>;

  if (provider === 'github') {
    let email = data.email as string | undefined;

    if (!email) {
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (emailResponse.ok) {
        const emails = await emailResponse.json() as Array<{ primary: boolean; verified: boolean; email: string }>;
        const primary = emails.find((e) => e.primary && e.verified);
        email = primary?.email || emails[0]?.email;
      }
    }

    if (!email) return null;

    return {
      id: String(data.id),
      email,
      name: (data.name as string) || (data.login as string),
    };
  }

  if (provider === 'google') {
    if (!data.email) return null;

    return {
      id: data.id as string,
      email: data.email as string,
      name: data.name as string,
    };
  }

  return null;
}

/**
 * Handle OAuth callback: exchange code, fetch profile, create/get user, return JWT
 */
export async function handleOAuthCallback(
  provider: 'github' | 'google',
  code: string
): Promise<{ success: boolean; token?: string; user?: User; error?: string }> {
  try {
    const accessToken = await exchangeCodeForToken(provider, code);
    if (!accessToken) {
      return { success: false, error: 'Failed to exchange code for token' };
    }

    const profile = await fetchUserProfile(provider, accessToken);
    if (!profile) {
      return { success: false, error: 'Failed to fetch user profile' };
    }

    let user = await usersRepository.getByOAuth(provider, profile.id);

    if (!user) {
      const existingUser = await usersRepository.getByEmail(profile.email);
      if (existingUser) {
        return { success: false, error: 'Email already registered. Please login with your existing method.' };
      }

      user = await usersRepository.createOAuth(profile.email, provider, profile.id);
      logger.info(`New OAuth user registered: ${profile.email} via ${provider}`);
    }

    const token = await generateToken(user);
    logger.info(`OAuth login: ${profile.email} via ${provider}`);

    return { success: true, token, user };
  } catch (error) {
    logger.error(`OAuth callback error for ${provider}`, error);
    return { success: false, error: 'OAuth authentication failed' };
  }
}

/**
 * Get list of enabled OAuth providers
 */
export function getEnabledProviders(): string[] {
  const providers: string[] = [];
  if (_githubConfig.clientId && _githubConfig.clientSecret) {
    providers.push('github');
  }
  if (_googleConfig.clientId && _googleConfig.clientSecret) {
    providers.push('google');
  }
  return providers;
}
