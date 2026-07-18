import type { NextFunction, Request, Response } from 'express';
import {
  ProjectNotFoundError,
  ProjectPermissionError,
} from '../services/ProjectManager.js';

export type AuthenticatedRequest = Request & {
  userId?: string;
  user?: {
    username: string;
    email: string;
    isGuest?: boolean;
    createdAt?: Date | string;
  } | null;
};

export function getUserId(req: Request): string {
  const userId = (req as AuthenticatedRequest).userId;
  if (!userId) throw new ProjectPermissionError('Missing authenticated user');
  return userId;
}

export function getRouteParam(req: Request, key: string): string | undefined {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : value;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function handleControllerError(
  error: unknown,
  res: Response,
  next: NextFunction,
): void {
  if (error instanceof ProjectNotFoundError) {
    res.status(404).json({ error: error.message });
    return;
  }
  if (error instanceof ProjectPermissionError) {
    res.status(403).json({ error: error.message });
    return;
  }
  next(error);
}
