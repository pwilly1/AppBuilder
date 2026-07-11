import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { IUserRepository } from '../repositories/UserRepository.js';
import { JwtService } from '../services/JwtService.js';
import type { AuthenticatedRequest } from '../controllers/controllerUtils.js';

export function createRequireAuth(tokens: JwtService, users: IUserRepository): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    if (!token) {
      res.status(401).json({ error: 'Missing Authorization token' });
      return;
    }

    try {
      const payload = tokens.verifyToken(token);
      const user = await users.findById(payload.userId);
      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }
      const authenticated = req as AuthenticatedRequest;
      authenticated.userId = payload.userId;
      authenticated.user = user;
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}
