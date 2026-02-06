import { Hono } from 'hono';
import type { Env } from '../env';
import { jwtAuth, type AuthEnv } from '../middleware/jwt-auth';
import { registerUser, loginUser, changePassword, getUserProfile, deleteUser } from '../../saas/services/auth-service';

const auth = new Hono<AuthEnv>();

/** POST /api/auth/register */
auth.post('/register', async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Email and password are required' }
      }, 400);
    }

    const result = await registerUser(email, password);

    if (!result.success) {
      return c.json({
        success: false,
        error: { code: 'REGISTRATION_FAILED', message: result.error }
      }, 400);
    }

    return c.json({
      success: true,
      data: {
        token: result.token,
        user: {
          id: result.user!.id,
          email: result.user!.email,
          plan_id: result.user!.plan_id,
          is_admin: result.user!.is_admin,
        }
      }
    }, 201);
  } catch {
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Registration failed' }
    }, 500);
  }
});

/** POST /api/auth/login */
auth.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Email and password are required' }
      }, 400);
    }

    const result = await loginUser(email, password);

    if (!result.success) {
      return c.json({
        success: false,
        error: { code: 'LOGIN_FAILED', message: result.error }
      }, 401);
    }

    return c.json({
      success: true,
      data: {
        token: result.token,
        user: {
          id: result.user!.id,
          email: result.user!.email,
          plan_id: result.user!.plan_id,
          is_admin: result.user!.is_admin,
        }
      }
    });
  } catch {
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Login failed' }
    }, 500);
  }
});

/** GET /api/auth/me — requires auth */
auth.get('/me', jwtAuth, async (c) => {
  try {
    const user = c.get('user');
    const profile = await getUserProfile(user.id);

    if (!profile) {
      return c.json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      }, 404);
    }

    return c.json({
      success: true,
      data: {
        user: {
          id: profile.user.id,
          email: profile.user.email,
          plan_id: profile.user.plan_id,
          is_admin: profile.user.is_admin,
          totp_enabled: profile.user.totp_enabled,
          created_at: profile.user.created_at,
        },
        plan: profile.plan,
      }
    });
  } catch {
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get profile' }
    }, 500);
  }
});

/** PUT /api/auth/password — requires auth */
auth.put('/password', jwtAuth, async (c) => {
  try {
    const user = c.get('user');
    const { current_password, new_password } = await c.req.json();

    if (!current_password || !new_password) {
      return c.json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Current and new password are required' }
      }, 400);
    }

    const result = await changePassword(user.id, current_password, new_password);

    if (!result.success) {
      return c.json({
        success: false,
        error: { code: 'PASSWORD_CHANGE_FAILED', message: result.error }
      }, 400);
    }

    return c.json({
      success: true,
      data: { message: 'Password changed successfully' }
    });
  } catch {
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Password change failed' }
    }, 500);
  }
});

/** DELETE /api/auth/account — requires auth */
auth.delete('/account', jwtAuth, async (c) => {
  try {
    const user = c.get('user');
    const success = await deleteUser(user.id);

    if (!success) {
      return c.json({
        success: false,
        error: { code: 'DELETE_FAILED', message: 'Failed to delete account' }
      }, 400);
    }

    return c.json({
      success: true,
      data: { message: 'Account deleted successfully' }
    });
  } catch {
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Account deletion failed' }
    }, 500);
  }
});

export default auth;
