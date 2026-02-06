import { createMiddleware } from 'hono/factory';
import type { Env } from '../env';
import { initD1Database } from '../../saas/database/init';
import { configureJwt } from '../../saas/services/auth-service';
import { configureTotpJwt } from '../../saas/services/totp-service';
import { configureOAuth } from '../../saas/services/oauth-service';

/**
 * Middleware that initializes SaaS services from Workers env bindings.
 * Must run before any route that uses auth, DB, or OAuth.
 */
export const initServices = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  // Initialize D1 database adapter
  initD1Database(c.env.USERS_DB);

  // Configure JWT with secret from env
  configureJwt(c.env.JWT_SECRET);
  configureTotpJwt(c.env.JWT_SECRET);

  // Configure OAuth providers from env
  configureOAuth({
    frontendUrl: c.env.FRONTEND_URL,
    github: {
      clientId: c.env.GITHUB_CLIENT_ID,
      clientSecret: c.env.GITHUB_CLIENT_SECRET,
      callbackUrl: c.env.GITHUB_CALLBACK_URL,
    },
    google: {
      clientId: c.env.GOOGLE_CLIENT_ID,
      clientSecret: c.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: c.env.GOOGLE_CALLBACK_URL,
    },
  });

  await next();
});
