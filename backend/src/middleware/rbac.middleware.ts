import { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';

/**
 * Creates middleware that allows only the specified roles.
 *
 * Authentication and authorization are deliberately separate:
 *
 * authenticateToken -> verifies who the user is
 * requireRole       -> verifies what the user is allowed to do
 *
 * This authorization check happens on the backend so users cannot
 * bypass permissions simply by modifying the React application.
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    /**
     * authenticateToken should run before requireRole.
     *
     * If no authenticated user exists, the request is not authorized.
     */
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    /**
     * Compare the role from the verified JWT against the roles
     * explicitly allowed for this endpoint.
     */
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
}