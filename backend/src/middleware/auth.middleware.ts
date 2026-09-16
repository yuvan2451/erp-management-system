import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Role } from '@prisma/client';

/**
 * Information extracted from a successfully verified JWT.
 *
 * This represents the identity and role that the backend trusts
 * after verifying the token signature.
 */
export interface AuthenticatedUser {
  userId: string;
  role: Role;
}

/**
 * Extend Express's Request type so controllers and later middleware
 * can safely access req.user after authentication succeeds.
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * JWT authentication middleware.
 *
 * This middleware verifies that the request contains a valid,
 * non-expired JWT signed with our server-side JWT secret.
 *
 * The role is taken only from the verified JWT. We never trust
 * role information supplied separately by the frontend.
 */
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({
      success: false,
      message: 'Invalid authorization header',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret);

    /**
     * jwt.verify() returns string | JwtPayload depending on the token.
     * We validate the expected claims before trusting them.
     */
    if (
      typeof decoded === 'string' ||
      typeof decoded.userId !== 'string' ||
      !Object.values(Role).includes(decoded.role as Role)
    ) {
      res.status(401).json({
        success: false,
        message: 'Invalid token payload',
      });
      return;
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role as Role,
    };

    next();
  } catch (error) {
    /**
     * InvalidSignature, expired tokens, and malformed tokens all
     * result in the same public response. We don't expose details
     * about why token verification failed.
     */
    console.warn('JWT verification failed');

    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
}