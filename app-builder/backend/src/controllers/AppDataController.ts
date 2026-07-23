import type { NextFunction, Request, Response } from 'express';
import {
  appDataRecordsToCsv,
  createAppDataRecord,
  findAppDataSource,
  getAppDataRecord,
  getLatestAppDataRecord,
  getAppDataCsvFileName,
  isPublicReadableCollection,
  isPublicSubmissionSource,
  listAppDataRecords,
  listAppDataSources,
} from '../services/AppDataService.js';
import { EmailNotificationService } from '../services/EmailNotificationService.js';
import { ProjectManager } from '../services/ProjectManager.js';
import type { ProjectRecord } from '../repositories/ProjectRepository.js';
import {
  getUserId,
  getRouteParam,
  handleControllerError,
  type AuthenticatedRequest,
} from './controllerUtils.js';

export class AppDataController {
  constructor(
    private readonly projects: ProjectManager,
    private readonly notifications: EmailNotificationService,
  ) {}

  listLegacySubmissions = async (req: Request, res: Response, next: NextFunction) => {
    const id = getRouteParam(req, 'id');
    const sourceId = getRouteParam(req, 'blockId');
    if (!id || !sourceId) return this.missingParams(res);
    await this.withOwnedProject(req, res, next, id, async (project, userId) => {
      if (!findAppDataSource(project, sourceId)) {
        res.status(404).json({ error: 'App data source not found' });
        return;
      }
      res.json(await listAppDataRecords(project, userId, id, sourceId));
    });
  };

  listSources = async (req: Request, res: Response, next: NextFunction) => {
    const id = getRouteParam(req, 'id');
    if (!id) return this.missingParams(res);
    await this.withOwnedProject(req, res, next, id, async (project, userId) => {
      res.json(await listAppDataSources(project, userId, id));
    });
  };

  exportRecordsCsv = async (req: Request, res: Response, next: NextFunction) => {
    const id = getRouteParam(req, 'id');
    const sourceId = getRouteParam(req, 'sourceId');
    if (!id || !sourceId) return this.missingParams(res);
    await this.withOwnedProject(req, res, next, id, async (project, userId) => {
      const source = findAppDataSource(project, sourceId);
      if (!source) {
        res.status(404).json({ error: 'App data source not found' });
        return;
      }
      const records = await listAppDataRecords(project, userId, id, sourceId);
      res.type('text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${getAppDataCsvFileName(project, source)}"`);
      res.send(appDataRecordsToCsv(source, records));
    });
  };

  listRecords = async (req: Request, res: Response, next: NextFunction) => {
    const id = getRouteParam(req, 'id');
    const sourceId = getRouteParam(req, 'sourceId');
    if (!id || !sourceId) return this.missingParams(res);
    await this.withOwnedProject(req, res, next, id, async (project, userId) => {
      res.json(await listAppDataRecords(project, userId, id, sourceId));
    });
  };

  submitOwnedLegacy = async (req: Request, res: Response, next: NextFunction) => {
    const id = getRouteParam(req, 'id');
    const sourceId = getRouteParam(req, 'blockId');
    if (!id || !sourceId) return this.missingParams(res);
    if ((req as AuthenticatedRequest).user?.isGuest) {
      res.status(403).json({ error: 'Guests cannot submit forms. Please create an account.' });
      return;
    }
    await this.withOwnedProject(req, res, next, id, async (project) => {
      await this.createAndRespond(project, sourceId, req.body, res);
    });
  };

  submitPublicLegacy = async (req: Request, res: Response, next: NextFunction) => {
    await this.submitPublic(getRouteParam(req, 'id'), getRouteParam(req, 'blockId'), req, res, next);
  };

  submitPublicRecord = async (req: Request, res: Response, next: NextFunction) => {
    await this.submitPublic(getRouteParam(req, 'id'), getRouteParam(req, 'sourceId'), req, res, next);
  };

  getLatestPublicCollectionRecord = async (req: Request, res: Response, next: NextFunction) => {
    const id = getRouteParam(req, 'id');
    const collectionId = getRouteParam(req, 'collectionId');
    if (!id || !collectionId) return this.missingParams(res);
    try {
      const project = await this.projects.findById(id);
      if (!project) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      if (!isPublicReadableCollection(project, collectionId)) {
        res.status(403).json({ error: 'This collection is not publicly readable' });
        return;
      }
      res.json(await getLatestAppDataRecord(project, project.ownerId, id, collectionId));
    } catch (error) {
      this.handleAppDataError(error, res, next);
    }
  };

  getPublicCollectionRecord = async (req: Request, res: Response, next: NextFunction) => {
    const id = getRouteParam(req, 'id');
    const collectionId = getRouteParam(req, 'collectionId');
    const recordId = getRouteParam(req, 'recordId');
    if (!id || !collectionId || !recordId) return this.missingParams(res);
    try {
      const project = await this.projects.findById(id);
      if (!project) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      if (!isPublicReadableCollection(project, collectionId)) {
        res.status(403).json({ error: 'This collection is not publicly readable' });
        return;
      }
      const record = await getAppDataRecord(project, project.ownerId, id, collectionId, recordId);
      if (!record) {
        res.status(404).json({ error: 'Record not found' });
        return;
      }
      res.json(record);
    } catch (error) {
      this.handleAppDataError(error, res, next);
    }
  };

  private async submitPublic(
    id: string | undefined,
    sourceId: string | undefined,
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    if (!id || !sourceId) return this.missingParams(res);
    try {
      // Public visibility is not modeled yet; preserving existing ID-based preview access.
      const project = await this.projects.findById(id);
      if (!project) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      if (!isPublicSubmissionSource(project, sourceId)) {
        res.status(404).json({ error: 'App data source not found' });
        return;
      }
      await this.createAndRespond(project, sourceId, req.body, res);
    } catch (error) {
      this.handleAppDataError(error, res, next);
    }
  }

  private async withOwnedProject(
    req: Request,
    res: Response,
    next: NextFunction,
    projectId: string,
    handler: (project: ProjectRecord, userId: string) => Promise<void>,
  ) {
    try {
      const userId = getUserId(req);
      const project = await this.projects.findOwned(projectId, userId);
      if (!project) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      await handler(project, userId);
    } catch (error) {
      this.handleAppDataError(error, res, next);
    }
  }

  private async createAndRespond(
    project: ProjectRecord,
    sourceId: string,
    body: unknown,
    res: Response,
  ) {
    const source = findAppDataSource(project, sourceId);
    if (!source) {
      res.status(404).json({ error: 'App data source not found' });
      return;
    }
    const record = await createAppDataRecord(project, sourceId, body || {});
    if (source.type === 'contactForm' && source.block) {
      try {
        const formTitle = typeof source.block.props?.title === 'string' ? source.block.props.title : undefined;
        const destinationEmail = this.getDestinationEmail(source.block);
        await this.notifications.notifyContactFormSubmission({
          projectId: project.id,
          projectName: project.name,
          submission: record,
          ...(formTitle ? { formTitle } : {}),
          ...(destinationEmail ? { destinationEmail } : {}),
        });
      } catch (error) {
        console.error('Submission notification failed:', error);
      }
    }
    res.status(201).json(record);
  }

  private getDestinationEmail(block: { props?: Record<string, unknown> }) {
    const value = block.props?.destinationEmail;
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private missingParams(res: Response) {
    res.status(400).json({ error: 'Missing route params' });
  }

  private handleAppDataError(error: unknown, res: Response, next: NextFunction) {
    if (error && typeof error === 'object' && 'status' in error && typeof error.status === 'number') {
      const message = 'message' in error && typeof error.message === 'string' ? error.message : 'Submission failed';
      res.status(error.status).json({ error: message });
      return;
    }
    handleControllerError(error, res, next);
  }
}
