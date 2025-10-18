// routes/ProjectRoutes.ts
import { Router } from 'express';
import { ProjectManager } from '../services/ProjectManager.js';
import { MongoProjectRepository } from '../repositories/MongoProjectRepository.js';
import { MongoUserRepository } from '../repositories/UserRepository.js';
import { requireAuth } from '../middleware/auth.js';

const svc = new ProjectManager(new MongoProjectRepository());
const userRepo = new MongoUserRepository();
export function makeProjectRoutes() {
  const router = Router();

  // List projects for current user
  router.get('/', requireAuth, async (req, res, next) => {
    try {
      const userId = (req as any).userId as string;
      const list = await (svc.repo.listByOwner ? svc.repo.listByOwner(userId) : []);
      console.debug('[ProjectRoutes] list projects count=', list.length, 'sample=', list[0]);
      res.json(list);
    } catch (e) { next(e); }
  });

  // Create a new project
  router.post('/', requireAuth, async (req, res, next) => {
    try {
      const userId = (req as any).userId as string;
      const user = (req as any).user as any;
      console.debug('[ProjectRoutes] POST /projects userId=', userId, 'isGuest=', !!user?.isGuest, 'hasAuthHeader=', !!req.headers.authorization, 'body=', req.body);
      if (user && user.isGuest) return res.status(403).json({ error: 'Guests cannot create projects. Please sign up.' });
      const payload = { ownerId: userId, name: req.body.name ?? 'Untitled Project' };
      const created = await svc.create(payload.name, payload);
      res.status(201).json(created);
    } catch (e) { next(e); }
  });

  // Get a single project
  router.get('/:id', requireAuth, async (req, res, next) => {
    try {
      const id = req.params.id as string | undefined;
      console.debug('[ProjectRoutes] GET /projects/:id id=', id);
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const project = await svc.repo.findById(id);
      if (!project) return res.status(404).json({ error: 'Not found' });
      res.json(project);
    } catch (e) { next(e); }
  });

  // Update (patch) existing project
  router.patch('/:id', requireAuth, async (req, res, next) => {
    try {
      const userId = (req as any).userId as string;
      const user = (req as any).user as any;
      console.debug('[ProjectRoutes] PATCH /projects/:id id=', req.params.id, 'userId=', userId, 'isGuest=', !!user?.isGuest, 'hasAuthHeader=', !!req.headers.authorization, 'body=', req.body);
      if (user && user.isGuest) return res.status(403).json({ error: 'Guests cannot save projects. Please create an account.' });
      const updated = await svc.update(userId, req.params.id, req.body);
      res.json(updated);
    } catch (e) { next(e); }
  });

  // Delete
  router.delete('/:id', requireAuth, async (req, res, next) => {
    try {
      const id = req.params.id as string | undefined;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      await svc.delete(id);
      res.status(204).end();
    } catch (e) { next(e); }
  });

  return router;
}