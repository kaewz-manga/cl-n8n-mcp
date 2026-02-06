import { SignJWT, jwtVerify } from 'jose';
import { usersRepository, User, plansRepository } from '../database/users-repository';
import { hashPassword, verifyPassword } from './encryption-service';
import { logger } from '../../utils/logger';

// JWT configuration - env-based for Workers, process.env fallback for Express
let _jwtSecret: string = 'development-jwt-secret-change-in-production';
let _jwtExpiresIn: string = '7d';

export function configureJwt(secret: string, expiresIn?: string): void {
  _jwtSecret = secret;
  if (expiresIn) _jwtExpiresIn = expiresIn;
}

// Initialize from process.env if available (Express mode)
try {
  if (typeof process !== 'undefined' && process.env) {
    _jwtSecret = process.env.JWT_SECRET || _jwtSecret;
    _jwtExpiresIn = process.env.JWT_EXPIRES_IN || _jwtExpiresIn;
  }
} catch { /* Workers mode - no process.env */ }

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(_jwtSecret);
}

function parseExpiresIn(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60; // default 7 days
  const value = parseInt(match[1]);
  switch (match[2]) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 24 * 60 * 60;
    default: return 7 * 24 * 60 * 60;
  }
}

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
    const existingUser = await usersRepository.getByEmail(email);
    if (existingUser) {
      return { success: false, error: 'Email already registered' };
    }

    if (!isValidEmail(email)) {
      return { success: false, error: 'Invalid email format' };
    }

    if (password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters' };
    }

    const passwordHash = await hashPassword(password);
    const user = await usersRepository.create(email, passwordHash);
    const token = await generateToken(user);

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
    const user = await usersRepository.getByEmail(email);
    if (!user) {
      return { success: false, error: 'Invalid email or password' };
    }

    if (!user.password_hash) {
      return { success: false, error: 'Please login with your OAuth provider' };
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return { success: false, error: 'Invalid email or password' };
    }

    const token = await generateToken(user);

    logger.info(`User logged in: ${email}`);
    return { success: true, user, token };
  } catch (error) {
    logger.error('Failed to login user', error);
    return { success: false, error: 'Login failed' };
  }
}

/**
 * Generate JWT token for user (async - uses jose)
 */
export async function generateToken(user: User): Promise<string> {
  const seconds = parseExpiresIn(_jwtExpiresIn);

  return await new SignJWT({
    userId: user.id,
    email: user.email,
    planId: user.plan_id,
    isAdmin: user.is_admin === 1,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + seconds)
    .sign(getSecretKey());
}

/**
 * Verify and decode JWT token (async - uses jose)
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Get user from JWT token
 */
export async function getUserFromToken(token: string): Promise<User | null> {
  const payload = await verifyToken(token);
  if (!payload) {
    return null;
  }

  return (await usersRepository.getById(payload.userId)) || null;
}

/**
 * Change user password
 */
export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<AuthResult> {
  try {
    const user = await usersRepository.getById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (user.password_hash) {
      const isValid = await verifyPassword(currentPassword, user.password_hash);
      if (!isValid) {
        return { success: false, error: 'Current password is incorrect' };
      }
    }

    if (newPassword.length < 8) {
      return { success: false, error: 'New password must be at least 8 characters' };
    }

    const newHash = await hashPassword(newPassword);
    await usersRepository.updatePassword(userId, newHash);

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
export async function getUserProfile(userId: string): Promise<{
  user: User;
  plan: { id: string; name: string; daily_request_limit: number; requests_per_minute: number; max_connections: number };
} | null> {
  const user = await usersRepository.getById(userId);
  if (!user) {
    return null;
  }

  const plan = await plansRepository.getById(user.plan_id);
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
export async function deleteUser(userId: string): Promise<boolean> {
  try {
    const user = await usersRepository.getById(userId);
    if (!user) {
      return false;
    }

    await usersRepository.delete(userId);
    logger.info(`User deleted: ${user.email}`);
    return true;
  } catch (error) {
    logger.error('Failed to delete user', error);
    return false;
  }
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
