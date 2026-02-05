import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../services/auth-service';
import { usersRepository } from '../database/users-repository';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        planId: string;
        isAdmin: boolean;
      };
    }
  }
}

/**
 * JWT authentication middleware
 * Extracts and validates JWT from Authorization header
 */
export function jwtAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'No token provided' }
    });
    return;
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix

  // Skip if it's an API key (n2f_ prefix)
  if (token.startsWith('n2f_')) {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'API keys cannot be used for dashboard authentication' }
    });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' }
    });
    return;
  }

  // Verify user still exists
  const user = usersRepository.getById(payload.userId);
  if (!user) {
    res.status(401).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'User no longer exists' }
    });
    return;
  }

  // Attach user to request
  req.user = {
    id: payload.userId,
    email: payload.email,
    planId: payload.planId,
    isAdmin: payload.isAdmin
  };

  next();
}

/**
 * Admin-only middleware
 * Must be used after jwtAuth
 */
export function adminOnly(req: Request, res: Response, next: NextFunction): void {
  if (!req.user?.isAdmin) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Admin access required' }
    });
    return;
  }

  next();
}

/**
 * Optional JWT auth - doesn't fail if no token provided
 */
export function optionalJwtAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.slice(7);

  // Skip API keys
  if (token.startsWith('n2f_')) {
    next();
    return;
  }

  const payload = verifyToken(token);
  if (payload) {
    req.user = {
      id: payload.userId,
      email: payload.email,
      planId: payload.planId,
      isAdmin: payload.isAdmin
    };
  }

  next();
}
