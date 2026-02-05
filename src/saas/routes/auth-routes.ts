import { Router, Request, Response } from 'express';
import { registerUser, loginUser, changePassword, getUserProfile, deleteUser } from '../services/auth-service';
import { jwtAuth } from '../middleware/jwt-auth';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Email and password are required' }
      });
      return;
    }

    const result = await registerUser(email, password);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: { code: 'REGISTRATION_FAILED', message: result.error }
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: {
        token: result.token,
        user: {
          id: result.user!.id,
          email: result.user!.email,
          plan_id: result.user!.plan_id,
          is_admin: result.user!.is_admin
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Registration failed' }
    });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Email and password are required' }
      });
      return;
    }

    const result = await loginUser(email, password);

    if (!result.success) {
      res.status(401).json({
        success: false,
        error: { code: 'LOGIN_FAILED', message: result.error }
      });
      return;
    }

    res.json({
      success: true,
      data: {
        token: result.token,
        user: {
          id: result.user!.id,
          email: result.user!.email,
          plan_id: result.user!.plan_id,
          is_admin: result.user!.is_admin
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Login failed' }
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', jwtAuth, (req: Request, res: Response) => {
  try {
    const profile = getUserProfile(req.user!.id);

    if (!profile) {
      res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
      return;
    }

    res.json({
      success: true,
      data: {
        user: {
          id: profile.user.id,
          email: profile.user.email,
          plan_id: profile.user.plan_id,
          is_admin: profile.user.is_admin,
          totp_enabled: profile.user.totp_enabled,
          created_at: profile.user.created_at
        },
        plan: profile.plan
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get profile' }
    });
  }
});

/**
 * PUT /api/auth/password
 * Change password
 */
router.put('/password', jwtAuth, async (req: Request, res: Response) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Current and new password are required' }
      });
      return;
    }

    const result = await changePassword(req.user!.id, current_password, new_password);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: { code: 'PASSWORD_CHANGE_FAILED', message: result.error }
      });
      return;
    }

    res.json({
      success: true,
      data: { message: 'Password changed successfully' }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Password change failed' }
    });
  }
});

/**
 * DELETE /api/auth/account
 * Delete user account
 */
router.delete('/account', jwtAuth, (req: Request, res: Response) => {
  try {
    const success = deleteUser(req.user!.id);

    if (!success) {
      res.status(400).json({
        success: false,
        error: { code: 'DELETE_FAILED', message: 'Failed to delete account' }
      });
      return;
    }

    res.json({
      success: true,
      data: { message: 'Account deleted successfully' }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Account deletion failed' }
    });
  }
});

export default router;
