import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    email: string;
  };
}

export interface JWTPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Authentication middleware for Supabase JWT tokens
 * For MVP development, we'll use a simplified approach
 */
export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ success: false, error: 'Access token required' });
    return;
  }

  try {
    // For development, we'll use a simplified verification
    // In production, this would verify against Supabase JWT secret
    if (process.env.NODE_ENV === 'development' && token === 'dev-token') {
      req.userId = 'dev-user-1';
      req.user = { id: 'dev-user-1', email: 'dev@example.com' };
      next();
      return;
    }

    // Production JWT verification (placeholder for Supabase integration)
    const jwtSecret = process.env.SUPABASE_JWT_SECRET || 'dev-secret';
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    req.userId = decoded.sub;
    req.user = { id: decoded.sub, email: decoded.email };
    next();
  } catch (error) {
    res.status(403).json({ success: false, error: 'Invalid or expired token' });
  }
};

// Alias for consistency with trades route
export const requireAuth = authenticateToken;