import type { Request, Response } from 'express';
import {
  AppUserAuthConflictError,
  AppUserAuthValidationError,
  InvalidAppUserCredentialsError,
} from '../auth/AppUserAuthContracts.js';
import type { AppUserAuthenticatedRequest } from '../middleware/appUserAuth.js';
import { AppUserAuthService, serializeAppUser } from '../services/AppUserAuthService.js';
import { ProjectManager } from '../services/ProjectManager.js';
import { getRouteParam } from './controllerUtils.js';

export class AppUserController {
  constructor(
    private readonly projects: ProjectManager,
    private readonly auth: AppUserAuthService,
  ) {}

  signup = async (req: Request, res: Response) => {
    const projectId = getRouteParam(req, 'id');
    if (!projectId) {
      res.status(400).json({ error: 'Missing project id' });
      return;
    }

    try {
      if (!await this.projects.findById(projectId)) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      const body = req.body as Record<string, unknown> | undefined;
      const result = await this.auth.signup(
        projectId,
        body?.displayName,
        body?.email,
        body?.password,
      );
      res.status(201).json(result);
    } catch (error: unknown) {
      if (error instanceof AppUserAuthValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }
      if (error instanceof AppUserAuthConflictError) {
        res.status(409).json({ error: error.message });
        return;
      }
      console.error('App-user signup failed:', error);
      res.status(500).json({ error: 'Unable to create an app account right now.' });
    }
  };

  login = async (req: Request, res: Response) => {
    const projectId = getRouteParam(req, 'id');
    if (!projectId) {
      res.status(400).json({ error: 'Missing project id' });
      return;
    }

    try {
      if (!await this.projects.findById(projectId)) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      const body = req.body as Record<string, unknown> | undefined;
      res.json(await this.auth.login(projectId, body?.email, body?.password));
    } catch (error: unknown) {
      if (
        error instanceof AppUserAuthValidationError
        || error instanceof InvalidAppUserCredentialsError
      ) {
        res.status(401).json({ error: 'Invalid email or password.' });
        return;
      }
      console.error('App-user login failed:', error);
      res.status(500).json({ error: 'Unable to sign in to this app right now.' });
    }
  };

  me = (req: Request, res: Response) => {
    const user = (req as AppUserAuthenticatedRequest).appUser;
    if (!user) {
      res.status(401).json({ error: 'Missing authenticated app user' });
      return;
    }
    res.json({ user: serializeAppUser(user) });
  };

  logout = (_req: Request, res: Response) => {
    // Runtime JWTs are stateless. Clients discard the token to end the session.
    res.sendStatus(204);
  };
}
