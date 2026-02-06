import { Hono } from 'hono';
import type { Env } from '../env';
import { getAuthorizationUrl, handleOAuthCallback, getEnabledProviders } from '../../saas/services/oauth-service';

const oauth = new Hono<{ Bindings: Env }>();

/** GET /api/auth/oauth/providers */
oauth.get('/providers', (c) => {
  return c.json({
    success: true,
    data: { providers: getEnabledProviders() }
  });
});

/** GET /api/auth/oauth/:provider — redirect to OAuth provider */
oauth.get('/:provider', (c) => {
  const provider = c.req.param('provider') as 'github' | 'google';

  if (provider !== 'github' && provider !== 'google') {
    return c.json({
      success: false,
      error: { code: 'INVALID_PROVIDER', message: 'Supported providers: github, google' }
    }, 400);
  }

  const url = getAuthorizationUrl(provider);
  if (!url) {
    return c.json({
      success: false,
      error: { code: 'PROVIDER_NOT_CONFIGURED', message: `${provider} OAuth is not configured` }
    }, 503);
  }

  return c.redirect(url);
});

/** GET /api/auth/oauth/:provider/callback — handle OAuth callback */
oauth.get('/:provider/callback', async (c) => {
  const provider = c.req.param('provider') as 'github' | 'google';
  const code = c.req.query('code');
  const error = c.req.query('error');
  const frontendUrl = c.env.FRONTEND_URL || 'http://localhost:5173';

  if (error) {
    return c.redirect(`${frontendUrl}/login?error=oauth_denied`);
  }

  if (!code) {
    return c.redirect(`${frontendUrl}/login?error=no_code`);
  }

  if (provider !== 'github' && provider !== 'google') {
    return c.redirect(`${frontendUrl}/login?error=invalid_provider`);
  }

  const result = await handleOAuthCallback(provider, code);

  if (!result.success || !result.token) {
    const errorMsg = encodeURIComponent(result.error || 'OAuth failed');
    return c.redirect(`${frontendUrl}/login?error=${errorMsg}`);
  }

  return c.redirect(`${frontendUrl}/oauth/callback?token=${result.token}&provider=${provider}`);
});

export default oauth;
