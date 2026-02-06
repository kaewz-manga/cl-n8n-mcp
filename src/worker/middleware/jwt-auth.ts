import { createMiddleware } from 'hono/factory';
import type { Env } from '../env';
import { verifyToken } from '../../saas/services/auth-service';
import { usersRepository } from '../../saas/database/users-repository';

export interface AuthUser {
  id: string;
  email: string;
  planId: string;
  isAdmin: boolean;
}

export type AuthEnv = { Bindings: Env; Variables: { user: AuthUser } };

/**
 * JWT authentication middleware for Hono.
 * Validates Bearer token and sets user on context.
 */
export const jwtAuth = createMiddleware<AuthEnv>(async (c, next): Promise<void | Response> => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'No token provided' }
    }, 401);
  }

  const token = authHeader.slice(7);

  // Reject API keys — they can't be used for dashboard auth
  if (token.startsWith('n2f_')) {
    return c.json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'API keys cannot be used for dashboard authentication' }
    }, 401);
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return c.json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' }
    }, 401);
  }

  // Verify user still exists
  const user = await usersRepository.getById(payload.userId);
  if (!user) {
    return c.json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'User no longer exists' }
    }, 401);
  }

  c.set('user', {
    id: payload.userId,
    email: payload.email,
    planId: payload.planId,
    isAdmin: payload.isAdmin,
  });

  await next();
});

/**
 * Admin-only middleware. Must be used after jwtAuth.
 */
export const adminOnly = createMiddleware<AuthEnv>(async (c, next): Promise<void | Response> => {
  const user = c.get('user');
  if (!user?.isAdmin) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Admin access required' }
    }, 403);
  }
  await next();
});
