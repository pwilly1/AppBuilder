// routes/ProjectRoutes.ts
import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { ProjectManager } from '../services/ProjectManager.js';
import { MongoProjectRepository } from '../repositories/MongoProjectRepository.js';
import { requireAuth } from '../middleware/auth.js';
import { EmailNotificationService } from '../services/EmailNotificationService.js';

const svc = new ProjectManager(new MongoProjectRepository());
const emailNotifications = new EmailNotificationService();

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

function findContactFormBlock(project: any, blockId: string) {
  const allBlocks = (project.pages || []).flatMap((page: any) => page.blocks || []);
  const block = allBlocks.find((entry: any) => entry.id === blockId);
  if (!block || block.type !== 'contactForm') return null;
  return block;
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

  router.get('/:id/forms/:blockId/submissions', requireAuth, async (req, res, next) => {
    try {
      const userId = (req as any).userId as string;
      const id = req.params.id as string | undefined;
      const blockId = req.params.blockId as string | undefined;
      if (!id || !blockId) return res.status(400).json({ error: 'Missing route params' });
      const project = await loadOwnedProject(id, userId);
      if (!project) return res.status(404).json({ error: 'Not found' });
      const submissions = ((project.formSubmissions as any[]) || []).filter((entry) => entry.blockId === blockId);
      res.json(submissions);
    } catch (e) { next(e); }
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

      const block = findContactFormBlock(project, blockId);
      if (!block) {
        return res.status(404).json({ error: 'Contact form block not found' });
      }

      const submission = buildSubmission(req.body || {}, blockId);

      const hasValue = Object.values(submission.data).some((value) => typeof value === 'string' && value.length > 0);
      if (!hasValue) {
        return res.status(400).json({ error: 'At least one field is required' });
      }

      const nextSubmissions = [ ...((project.formSubmissions as any[]) || []), submission ];
      const updated = await svc.update(userId, id, { formSubmissions: nextSubmissions });
      const savedSubmission = ((updated.formSubmissions as any[]) || []).find((entry) => entry.id === submission.id) || submission;
      await notifySubmission(updated, block, savedSubmission);
      res.status(201).json(savedSubmission);
    } catch (e) { next(e); }
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

      const block = findContactFormBlock(project, blockId);
      if (!block) return res.status(404).json({ error: 'Contact form block not found' });

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
      await notifySubmission(updated, block, savedSubmission);
      res.status(201).json(savedSubmission);
    } catch (e) { next(e); }
  });

  return router;
}
