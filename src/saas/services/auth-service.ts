import jwt, { SignOptions } from 'jsonwebtoken';
import { usersRepository, User, plansRepository } from '../database/users-repository';
import { hashPassword, verifyPassword } from './encryption-service';
import { logger } from '../../utils/logger';

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'development-jwt-secret-change-in-production';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];

export interface JWTPayload {
  userId: string;
  email: string;
  planId: string;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

/**
 * Register a new user with email and password
 */
export async function registerUser(email: string, password: string): Promise<AuthResult> {
  try {
    // Check if user already exists
    const existingUser = usersRepository.getByEmail(email);
    if (existingUser) {
      return { success: false, error: 'Email already registered' };
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return { success: false, error: 'Invalid email format' };
    }

    // Validate password strength
    if (password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters' };
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = usersRepository.create(email, passwordHash);

    // Generate JWT
    const token = generateToken(user);

    logger.info(`New user registered: ${email}`);
    return { success: true, user, token };
  } catch (error) {
    logger.error('Failed to register user', error);
    return { success: false, error: 'Registration failed' };
  }
}

/**
 * Login with email and password
 */
export async function loginUser(email: string, password: string): Promise<AuthResult> {
  try {
    const user = usersRepository.getByEmail(email);
    if (!user) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Check if user has a password (might be OAuth-only)
    if (!user.password_hash) {
      return { success: false, error: 'Please login with your OAuth provider' };
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Generate JWT
    const token = generateToken(user);

    logger.info(`User logged in: ${email}`);
    return { success: true, user, token };
  } catch (error) {
    logger.error('Failed to login user', error);
    return { success: false, error: 'Login failed' };
  }
}

/**
 * Generate JWT token for user
 */
export function generateToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    planId: user.plan_id,
    isAdmin: user.is_admin === 1
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Get user from JWT token
 */
export function getUserFromToken(token: string): User | null {
  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  return usersRepository.getById(payload.userId) || null;
}

/**
 * Change user password
 */
export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<AuthResult> {
  try {
    const user = usersRepository.getById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Verify current password
    if (user.password_hash) {
      const isValid = await verifyPassword(currentPassword, user.password_hash);
      if (!isValid) {
        return { success: false, error: 'Current password is incorrect' };
      }
    }

    // Validate new password
    if (newPassword.length < 8) {
      return { success: false, error: 'New password must be at least 8 characters' };
    }

    // Update password
    const newHash = await hashPassword(newPassword);
    usersRepository.updatePassword(userId, newHash);

    logger.info(`Password changed for user: ${user.email}`);
    return { success: true, user };
  } catch (error) {
    logger.error('Failed to change password', error);
    return { success: false, error: 'Password change failed' };
  }
}

/**
 * Get user profile with plan details
 */
export function getUserProfile(userId: string): {
  user: User;
  plan: { id: string; name: string; daily_request_limit: number; requests_per_minute: number; max_connections: number };
} | null {
  const user = usersRepository.getById(userId);
  if (!user) {
    return null;
  }

  const plan = plansRepository.getById(user.plan_id);
  const planInfo = plan || {
    id: 'free',
    name: 'Free',
    daily_request_limit: 100,
    requests_per_minute: 10,
    max_connections: 1
  };

  return {
    user,
    plan: {
      id: planInfo.id,
      name: planInfo.name,
      daily_request_limit: planInfo.daily_request_limit,
      requests_per_minute: planInfo.requests_per_minute,
      max_connections: planInfo.max_connections
    }
  };
}

/**
 * Delete user account
 */
export function deleteUser(userId: string): boolean {
  try {
    const user = usersRepository.getById(userId);
    if (!user) {
      return false;
    }

    usersRepository.delete(userId);
    logger.info(`User deleted: ${user.email}`);
    return true;
  } catch (error) {
    logger.error('Failed to delete user', error);
    return false;
  }
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
