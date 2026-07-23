import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { AppUser } from '../models/AppUser.js';
import type { AppUserRepository } from '../repositories/AppUserRepository.js';
import { AppUserTokenService } from '../services/AppUserTokenService.js';

export type AppUserAuthenticatedRequest = Request & {
  appUserId?: string;
  appUser?: AppUser | null;
};

export function createRequireAppUser(
  tokens: AppUserTokenService,
  users: AppUserRepository,
): RequestHandler {
  return createAppUserAuthHandler(tokens, users, true);
}

export function createOptionalAppUser(
  tokens: AppUserTokenService,
  users: AppUserRepository,
): RequestHandler {
  return createAppUserAuthHandler(tokens, users, false);
}

function createAppUserAuthHandler(
  tokens: AppUserTokenService,
  users: AppUserRepository,
  required: boolean,
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const hasExplicitAppUserToken = Boolean(readExplicitAppUserToken(req));
    const token = readBearerToken(req);
    if (!token) {
      if (required) {
        res.status(401).json({ error: 'Missing app-user session token' });
        return;
      }
      next();
      return;
    }

    try {
      const payload = tokens.verifyToken(token);
      const routeProjectId = readProjectId(req);
      if (!routeProjectId || payload.projectId !== routeProjectId) {
        res.status(401).json({ error: 'App-user session does not belong to this project' });
        return;
      }

      const user = await users.findById(payload.appUserId);
      if (!user || user.projectId !== payload.projectId) {
        res.status(401).json({ error: 'App user not found' });
        return;
      }

      const authenticated = req as AppUserAuthenticatedRequest;
      authenticated.appUserId = payload.appUserId;
      authenticated.appUser = user;
      next();
    } catch {
      if (!required && !hasExplicitAppUserToken) {
        // Legacy editor clients used builder Authorization tokens on public routes.
        next();
        return;
      }
      res.status(401).json({ error: 'Invalid or expired app-user session' });
    }
  };
}

function readBearerToken(req: Request): string | undefined {
  const explicit = readExplicitAppUserToken(req);
  if (explicit) return explicit;
  const header = req.headers.authorization;
  if (!header) return undefined;
  return header.startsWith('Bearer ') ? header.slice(7) : header;
}

function readExplicitAppUserToken(req: Request): string | undefined {
  const value = req.headers['x-apptura-app-user-token'];
  if (Array.isArray(value)) return value[0];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readProjectId(req: Request): string | undefined {
  const value = req.params.id;
  return Array.isArray(value) ? value[0] : value;
}
