// routes/ProjectRoutes.ts
import { randomUUID } from 'node:crypto';
import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { ProjectManager } from '../services/ProjectManager.js';
import { MongoProjectRepository } from '../repositories/MongoProjectRepository.js';
import { requireAuth } from '../middleware/auth.js';
import { EmailNotificationService } from '../services/EmailNotificationService.js';
import {
  AssetStorageNotConfiguredError,
  AssetStorageService,
  isSupportedImageContentType,
} from '../services/AssetStorageService.js';
import {
  appDataRecordsToCsv,
  createAppDataRecord,
  findAppDataSource,
  getAppDataCsvFileName,
  listAppDataRecords,
  listAppDataSources,
} from '../services/AppDataService.js';

const svc = new ProjectManager(new MongoProjectRepository());
const emailNotifications = new EmailNotificationService();
const assetStorage = new AssetStorageService();
const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

function buildSubmission(body: any, blockId: string) {
  return {
    id: randomUUID(),
    blockId,
    data: {
      name: typeof body?.name === 'string' ? body.name.trim() : undefined,
      email: typeof body?.email === 'string' ? body.email.trim() : undefined,
      phone: typeof body?.phone === 'string' ? body.phone.trim() : undefined,
      message: typeof body?.message === 'string' ? body.message.trim() : undefined,
    },
    submittedAt: new Date(),
  };
}

function getDestinationEmail(block: any) {
  const raw = typeof block?.props?.destinationEmail === 'string' ? block.props.destinationEmail.trim() : '';
  return raw || undefined;
}

async function notifySubmission(project: any, block: any, submission: any) {
  try {
    await emailNotifications.notifyContactFormSubmission({
      projectId: project.id,
      projectName: project.name,
      formTitle: typeof block?.props?.title === 'string' ? block.props.title : undefined,
      destinationEmail: getDestinationEmail(block),
      submission,
    });
  } catch (error) {
    console.error('Submission notification failed:', error);
  }
}

function handleMulterError(error: any, _req: Request, res: Response, next: NextFunction) {
  if (!error) return next();
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Image must be 5 MB or smaller.' });
    }
    return res.status(400).json({ error: error.message });
  }
  return next(error);
}

function handleSubmissionError(error: any, res: Response, next: NextFunction) {
  if (typeof error?.status === 'number') {
    return res.status(error.status).json({ error: error.message || 'Submission failed' });
  }
  return next(error);
}

export function makeProjectRoutes() {
  const router = Router();

  async function loadOwnedProject(projectId: string, userId: string) {
    const project = await svc.repo.findById(projectId);
    if (!project || project.ownerId !== userId) return null;
    return project;
  }

  // List projects for current user
  router.get('/', requireAuth, async (req, res, next) => {
    try {
      const userId = (req as any).userId as string;
      const list = await (svc.repo.listByOwner ? svc.repo.listByOwner(userId) : []);
      res.json(list);
    } catch (e) { next(e); }
  });

  // Create a new project
  router.post('/', requireAuth, async (req, res, next) => {
    try {
      const userId = (req as any).userId as string;
      const user = (req as any).user as any;
      if (user && user.isGuest) return res.status(403).json({ error: 'Guests cannot create projects. Please sign up.' });
      const payload = { ownerId: userId, name: req.body.name ?? 'Untitled Project' };
      const created = await svc.create(payload.name, payload);
      res.status(201).json(created);
    } catch (e) { next(e); }
  });

  router.post(
    '/:id/assets/images',
    requireAuth,
    (req, res, next) => uploadImage.single('file')(req, res, (error) => handleMulterError(error, req, res, next)),
    async (req, res, next) => {
      try {
        const userId = (req as any).userId as string;
        const user = (req as any).user as any;
        if (user && user.isGuest) return res.status(403).json({ error: 'Guests cannot upload images. Please create an account.' });

        const id = req.params.id as string | undefined;
        if (!id) return res.status(400).json({ error: 'Missing id' });

        const project = await loadOwnedProject(id, userId);
        if (!project) return res.status(404).json({ error: 'Not found' });

        const file = (req as any).file as Express.Multer.File | undefined;
        if (!file) return res.status(400).json({ error: 'Missing image file.' });
        if (!isSupportedImageContentType(file.mimetype)) {
          return res.status(400).json({ error: 'Unsupported image file type.' });
        }

        const uploaded = await assetStorage.uploadProjectImage({
          projectId: id,
          buffer: file.buffer,
          contentType: file.mimetype,
        });

        res.status(201).json({
          ...uploaded,
          fileName: file.originalname,
        });
      } catch (e) {
        if (e instanceof AssetStorageNotConfiguredError) {
          return res.status(503).json({ error: 'Image uploads are not configured for this environment.' });
        }
        next(e);
      }
    },
  );

  router.get('/:id/forms/:blockId/submissions', requireAuth, async (req, res, next) => {
    try {
      const userId = (req as any).userId as string;
      const id = req.params.id as string | undefined;
      const blockId = req.params.blockId as string | undefined;
      if (!id || !blockId) return res.status(400).json({ error: 'Missing route params' });
      const project = await loadOwnedProject(id, userId);
      if (!project) return res.status(404).json({ error: 'Not found' });

      if (!findAppDataSource(project, blockId)) return res.status(404).json({ error: 'App data source not found' });

      const submissions = await listAppDataRecords(project, userId, id, blockId);
      res.json(submissions);
    } catch (e) { next(e); }
  });

  router.get('/:id/app-data/sources', requireAuth, async (req, res, next) => {
    try {
      const userId = (req as any).userId as string;
      const id = req.params.id as string | undefined;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const project = await loadOwnedProject(id, userId);
      if (!project) return res.status(404).json({ error: 'Not found' });

      const sources = await listAppDataSources(project, userId, id);
      res.json(sources);
    } catch (e) { next(e); }
  });

  router.get('/:id/app-data/sources/:sourceId/records.csv', requireAuth, async (req, res, next) => {
    try {
      const userId = (req as any).userId as string;
      const id = req.params.id as string | undefined;
      const sourceId = req.params.sourceId as string | undefined;
      if (!id || !sourceId) return res.status(400).json({ error: 'Missing route params' });
      const project = await loadOwnedProject(id, userId);
      if (!project) return res.status(404).json({ error: 'Not found' });

      const source = findAppDataSource(project, sourceId);
      if (!source) return res.status(404).json({ error: 'App data source not found' });
      const records = await listAppDataRecords(project, userId, id, sourceId);
      const csv = appDataRecordsToCsv(source, records);
      res.type('text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${getAppDataCsvFileName(project, source)}"`);
      res.send(csv);
    } catch (e) { next(e); }
  });

  router.get('/:id/app-data/sources/:sourceId/records', requireAuth, async (req, res, next) => {
    try {
      const userId = (req as any).userId as string;
      const id = req.params.id as string | undefined;
      const sourceId = req.params.sourceId as string | undefined;
      if (!id || !sourceId) return res.status(400).json({ error: 'Missing route params' });
      const project = await loadOwnedProject(id, userId);
      if (!project) return res.status(404).json({ error: 'Not found' });

      const records = await listAppDataRecords(project, userId, id, sourceId);
      res.json(records);
    } catch (e) {
      handleSubmissionError(e, res, next);
    }
  });

  router.post('/:id/forms/:blockId/submissions', requireAuth, async (req, res, next) => {
    try {
      const userId = (req as any).userId as string;
      const user = (req as any).user as any;
      if (user && user.isGuest) return res.status(403).json({ error: 'Guests cannot submit forms. Please create an account.' });

      const id = req.params.id as string | undefined;
      const blockId = req.params.blockId as string | undefined;
      if (!id || !blockId) return res.status(400).json({ error: 'Missing route params' });

      const project = await loadOwnedProject(id, userId);
      if (!project) return res.status(404).json({ error: 'Not found' });

      const source = findAppDataSource(project, blockId);
      if (!source) return res.status(404).json({ error: 'App data source not found' });

      if (source.type !== 'contactForm') {
        const submission = await createAppDataRecord(project, blockId, req.body || {});
        return res.status(201).json(submission);
      }

      const submission = buildSubmission(req.body || {}, blockId);

      const hasValue = Object.values(submission.data).some((value) => typeof value === 'string' && value.length > 0);
      if (!hasValue) {
        return res.status(400).json({ error: 'At least one field is required' });
      }

      const nextSubmissions = [ ...((project.formSubmissions as any[]) || []), submission ];
      const updated = await svc.update(userId, id, { formSubmissions: nextSubmissions });
      const savedSubmission = ((updated.formSubmissions as any[]) || []).find((entry) => entry.id === submission.id) || submission;
      await notifySubmission(updated, source.block, savedSubmission);
      res.status(201).json(savedSubmission);
    } catch (e) { handleSubmissionError(e, res, next); }
  });

  // Get a single project
  router.get('/:id', requireAuth, async (req, res, next) => {
    try {
      const userId = (req as any).userId as string;
      const id = req.params.id as string | undefined;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const project = await loadOwnedProject(id, userId);
      if (!project) return res.status(404).json({ error: 'Not found' });
      res.json(project);
    } catch (e) { next(e); }
  });

  // Update (patch) existing project
  router.patch('/:id', requireAuth, async (req, res, next) => {
    try {
      const userId = (req as any).userId as string;
      const user = (req as any).user as any;
      if (user && user.isGuest) return res.status(403).json({ error: 'Guests cannot save projects. Please create an account.' });
      const updated = await svc.update(userId, req.params.id, req.body);
      res.json(updated);
    } catch (e) { next(e); }
  });

  // Delete
  router.delete('/:id', requireAuth, async (req, res, next) => {
    try {
      const userId = (req as any).userId as string;
      const id = req.params.id as string | undefined;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const project = await loadOwnedProject(id, userId);
      if (!project) return res.status(404).json({ error: 'Not found' });
      await svc.delete(id);
      res.status(204).end();
    } catch (e) { next(e); }
  });

  return router;
}

export function makePublicProjectRoutes() {
  const router = Router();

  router.post('/projects/:id/forms/:blockId/submissions', async (req, res, next) => {
    try {
      const id = req.params.id as string | undefined;
      const blockId = req.params.blockId as string | undefined;
      if (!id || !blockId) return res.status(400).json({ error: 'Missing route params' });

      const project = await svc.repo.findById(id);
      if (!project) return res.status(404).json({ error: 'Not found' });

      const source = findAppDataSource(project, blockId);
      if (!source) return res.status(404).json({ error: 'App data source not found' });

      if (source.type !== 'contactForm') {
        const submission = await createAppDataRecord(project, blockId, req.body || {});
        return res.status(201).json(submission);
      }

      const submission = buildSubmission(req.body || {}, blockId);
      const hasValue = Object.values(submission.data).some((value) => typeof value === 'string' && value.length > 0);
      if (!hasValue) {
        return res.status(400).json({ error: 'At least one field is required' });
      }

      const updated = await svc.repo.update({
        ...(project as any),
        formSubmissions: [ ...((project.formSubmissions as any[]) || []), submission ],
      });
      const savedSubmission = ((updated.formSubmissions as any[]) || []).find((entry) => entry.id === submission.id) || submission;
      await notifySubmission(updated, source.block, savedSubmission);
      res.status(201).json(savedSubmission);
    } catch (e) { handleSubmissionError(e, res, next); }
  });

  router.post('/projects/:id/app-data/sources/:sourceId/records', async (req, res, next) => {
    try {
      const id = req.params.id as string | undefined;
      const sourceId = req.params.sourceId as string | undefined;
      if (!id || !sourceId) return res.status(400).json({ error: 'Missing route params' });

      const project = await svc.repo.findById(id);
      if (!project) return res.status(404).json({ error: 'Not found' });

      const source = findAppDataSource(project, sourceId);
      if (!source) return res.status(404).json({ error: 'App data source not found' });

      if (source.type !== 'contactForm') {
        const record = await createAppDataRecord(project, sourceId, req.body || {});
        return res.status(201).json(record);
      }

      const submission = buildSubmission(req.body || {}, sourceId);
      const hasValue = Object.values(submission.data).some((value) => typeof value === 'string' && value.length > 0);
      if (!hasValue) {
        return res.status(400).json({ error: 'At least one field is required' });
      }

      const updated = await svc.repo.update({
        ...(project as any),
        formSubmissions: [ ...((project.formSubmissions as any[]) || []), submission ],
      });
      const savedSubmission = ((updated.formSubmissions as any[]) || []).find((entry) => entry.id === submission.id) || submission;
      await notifySubmission(updated, source.block, savedSubmission);
      res.status(201).json(savedSubmission);
    } catch (e) {
      handleSubmissionError(e, res, next);
    }
  });

  return router;
}
