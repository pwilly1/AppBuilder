import type { NextFunction, Request, Response } from 'express';
import { ProjectManager } from '../services/ProjectManager.js';
import {
  getUserId,
  getRouteParam,
  handleControllerError,
  isRecord,
} from './controllerUtils.js';

export class ProjectController {
  constructor(private readonly projects: ProjectManager) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await this.projects.listOwned(getUserId(req)));
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = isRecord(req.body) ? req.body : {};
      const name = typeof body.name === 'string' ? body.name : 'Untitled Project';
      const project = await this.projects.create(name, {
        ownerId: getUserId(req),
        ...(typeof body.schemaVersion === 'number' ? { schemaVersion: body.schemaVersion } : {}),
        ...(Array.isArray(body.pages) ? { pages: body.pages } : {}),
        ...(Array.isArray(body.dataCollections) ? { dataCollections: body.dataCollections } : {}),
      });
      res.status(201).json(project);
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };

  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getRouteParam(req, 'id');
      if (!id) {
        res.status(400).json({ error: 'Missing id' });
        return;
      }
      const project = await this.projects.findOwned(id, getUserId(req));
      if (!project) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.json(project);
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getRouteParam(req, 'id');
      if (!id) {
        res.status(400).json({ error: 'Missing id' });
        return;
      }
      const updates = isRecord(req.body) ? req.body : {};
      res.json(await this.projects.update(getUserId(req), id, updates));
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getRouteParam(req, 'id');
      if (!id) {
        res.status(400).json({ error: 'Missing id' });
        return;
      }
      await this.projects.deleteOwned(getUserId(req), id);
      res.status(204).end();
    } catch (error) {
      handleControllerError(error, res, next);
    }
  };
}
