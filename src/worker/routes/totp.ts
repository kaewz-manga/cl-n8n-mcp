import { Hono } from 'hono';
import { jwtAuth, type AuthEnv } from '../middleware/jwt-auth';
import { usersRepository } from '../../saas/database/users-repository';
import { generateToken } from '../../saas/services/auth-service';
import { verifyPassword } from '../../saas/services/encryption-service';
import {
  generateTotpSecret,
  verifyTotpCode,
  generatePendingToken,
  verifyPendingToken,
} from '../../saas/services/totp-service';

const totp = new Hono<AuthEnv>();

/** POST /api/auth/totp/setup — Generate TOTP secret + URI (requires auth) */
totp.post('/setup', jwtAuth, async (c) => {
  try {
    const user = c.get('user');
    const dbUser = await usersRepository.getById(user.id);

    if (!dbUser) {
      return c.json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      }, 404);
    }

    if (dbUser.totp_enabled === 1) {
      return c.json({
        success: false,
        error: { code: 'TOTP_ALREADY_ENABLED', message: '2FA is already enabled' },
      }, 400);
    }

    const { secret, uri } = generateTotpSecret(user.email);

    return c.json({
      success: true,
      data: { secret, uri },
    });
  } catch {
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to setup 2FA' },
    }, 500);
  }
});

/** POST /api/auth/totp/enable — Verify code and enable 2FA (requires auth) */
totp.post('/enable', jwtAuth, async (c) => {
  try {
    const user = c.get('user');
    const { secret, code } = await c.req.json();

    if (!secret || !code) {
      return c.json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Secret and code are required' },
      }, 400);
    }

    const isValid = verifyTotpCode(secret, code);
    if (!isValid) {
      return c.json({
        success: false,
        error: { code: 'INVALID_CODE', message: 'Invalid verification code' },
      }, 400);
    }

    await usersRepository.enableTotp(user.id, secret);

    return c.json({
      success: true,
      data: { message: '2FA enabled successfully' },
    });
  } catch {
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to enable 2FA' },
    }, 500);
  }
});

/** POST /api/auth/totp/verify-login — Verify TOTP during login (no auth, uses pending token) */
totp.post('/verify-login', async (c) => {
  try {
    const { token, code } = await c.req.json();

    if (!token || !code) {
      return c.json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Token and code are required' },
      }, 400);
    }

    const pending = await verifyPendingToken(token);
    if (!pending) {
      return c.json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired verification token' },
      }, 401);
    }

    const user = await usersRepository.getById(pending.userId);
    if (!user || !user.totp_secret) {
      return c.json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' },
      }, 404);
    }

    const isValid = verifyTotpCode(user.totp_secret, code);
    if (!isValid) {
      return c.json({
        success: false,
        error: { code: 'INVALID_CODE', message: 'Invalid verification code' },
      }, 400);
    }

    const fullToken = await generateToken(user);

    return c.json({
      success: true,
      data: {
        token: fullToken,
        user: {
          id: user.id,
          email: user.email,
          plan_id: user.plan_id,
          is_admin: user.is_admin,
        },
      },
    });
  } catch {
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Verification failed' },
    }, 500);
  }
});

/** DELETE /api/auth/totp — Disable 2FA (requires auth + password + TOTP code) */
totp.delete('/', jwtAuth, async (c) => {
  try {
    const authUser = c.get('user');
    const { password, code } = await c.req.json();

    if (!password || !code) {
      return c.json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Password and code are required' },
      }, 400);
    }

    const user = await usersRepository.getById(authUser.id);
    if (!user || !user.totp_secret) {
      return c.json({
        success: false,
        error: { code: 'TOTP_NOT_ENABLED', message: '2FA is not enabled' },
      }, 400);
    }

    // Verify password
    if (!user.password_hash) {
      return c.json({
        success: false,
        error: { code: 'NO_PASSWORD', message: 'OAuth users must set a password first' },
      }, 400);
    }

    const passwordValid = await verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      return c.json({
        success: false,
        error: { code: 'INVALID_PASSWORD', message: 'Invalid password' },
      }, 400);
    }

    // Verify TOTP code
    const codeValid = verifyTotpCode(user.totp_secret, code);
    if (!codeValid) {
      return c.json({
        success: false,
        error: { code: 'INVALID_CODE', message: 'Invalid verification code' },
      }, 400);
    }

    await usersRepository.disableTotp(authUser.id);

    return c.json({
      success: true,
      data: { message: '2FA disabled successfully' },
    });
  } catch {
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to disable 2FA' },
    }, 500);
  }
});

export default totp;
