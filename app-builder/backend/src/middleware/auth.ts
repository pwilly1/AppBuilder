// © 2025 Preston Willis. All rights reserved.
import type { Request, Response, NextFunction } from 'express';
import { SessionManager } from '../services/SessionManager.js';
import { MongoUserRepository } from '../repositories/UserRepository.js';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  if (!token) return res.status(401).json({ error: 'Missing Authorization token' });
  try {
    const payload: any = SessionManager.getInstance().verify(token);
    // payload may contain userId or sub depending on how it's signed
    const userId = payload.userId ?? payload.sub;
    (req as any).userId = userId;

    // attach full user object for downstream handlers (so routes can check isGuest without extra DB calls)
    try {
      const userRepo = new MongoUserRepository();
      const user = await userRepo.findById(userId);
      (req as any).user = user || null;
    } catch (err) {
      (req as any).user = null;
    }

    return next();
  } catch (err: any) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
