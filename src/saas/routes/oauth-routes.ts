import { Router, Request, Response } from 'express';
import { getAuthorizationUrl, handleOAuthCallback, getEnabledProviders } from '../services/oauth-service';

const router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * GET /api/auth/oauth/providers
 * List enabled OAuth providers
 */
router.get('/providers', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: { providers: getEnabledProviders() }
  });
});

/**
 * GET /api/auth/oauth/:provider
 * Redirect to OAuth provider authorization page
 */
router.get('/:provider', (req: Request, res: Response) => {
  const provider = req.params.provider as 'github' | 'google';

  if (provider !== 'github' && provider !== 'google') {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_PROVIDER', message: 'Supported providers: github, google' }
    });
    return;
  }

  const url = getAuthorizationUrl(provider);
  if (!url) {
    res.status(503).json({
      success: false,
      error: { code: 'PROVIDER_NOT_CONFIGURED', message: `${provider} OAuth is not configured` }
    });
    return;
  }

  res.redirect(url);
});

/**
 * GET /api/auth/oauth/:provider/callback
 * Handle OAuth callback from provider
 */
router.get('/:provider/callback', async (req: Request, res: Response) => {
  const provider = req.params.provider as 'github' | 'google';
  const code = req.query.code as string;
  const error = req.query.error as string;

  if (error) {
    res.redirect(`${FRONTEND_URL}/login?error=oauth_denied`);
    return;
  }

  if (!code) {
    res.redirect(`${FRONTEND_URL}/login?error=no_code`);
    return;
  }

  if (provider !== 'github' && provider !== 'google') {
    res.redirect(`${FRONTEND_URL}/login?error=invalid_provider`);
    return;
  }

  const result = await handleOAuthCallback(provider, code);

  if (!result.success || !result.token) {
    const errorMsg = encodeURIComponent(result.error || 'OAuth failed');
    res.redirect(`${FRONTEND_URL}/login?error=${errorMsg}`);
    return;
  }

  // Redirect to frontend with token
  res.redirect(`${FRONTEND_URL}/oauth/callback?token=${result.token}&provider=${provider}`);
});

export default router;
