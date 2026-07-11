import type { NextFunction, Request, Response } from 'express';
import {
  AssetStorageNotConfiguredError,
  AssetStorageService,
  isSupportedImageContentType,
} from '../services/AssetStorageService.js';
import { ProjectManager } from '../services/ProjectManager.js';
import {
  getRouteParam,
  getUserId,
  handleControllerError,
  type AuthenticatedRequest,
} from './controllerUtils.js';

export class AssetController {
  constructor(
    private readonly projects: ProjectManager,
    private readonly assets: AssetStorageService,
  ) {}

  uploadProjectImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if ((req as AuthenticatedRequest).user?.isGuest) {
        res.status(403).json({ error: 'Guests cannot upload images. Please create an account.' });
        return;
      }
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

      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'Missing image file.' });
        return;
      }
      if (!isSupportedImageContentType(file.mimetype)) {
        res.status(400).json({ error: 'Unsupported image file type.' });
        return;
      }

      const uploaded = await this.assets.uploadProjectImage({
        projectId: id,
        buffer: file.buffer,
        contentType: file.mimetype,
      });
      res.status(201).json({ ...uploaded, fileName: file.originalname });
    } catch (error) {
      if (error instanceof AssetStorageNotConfiguredError) {
        res.status(503).json({ error: 'Image uploads are not configured for this environment.' });
        return;
      }
      handleControllerError(error, res, next);
    }
  };
}
