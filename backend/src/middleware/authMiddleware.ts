import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types';

import prisma from '../prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_jwt_key_12345_crrs';

export const authenticateJWT = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header is missing' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Bearer token is missing' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    // Verify that the user still exists in the database to prevent foreign key errors with stale tokens
    const userExists = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!userExists) {
      return res.status(401).json({ error: 'Stale session: User no longer exists. Please log in again.' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token is invalid or expired' });
  }
};

/**
 * Middleware builder to restrict access to specific roles.
 * Example: authorizeRoles('ADMIN')
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User is unauthenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};
