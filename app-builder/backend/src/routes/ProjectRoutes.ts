// routes/projectRoutes.ts
import { Router } from 'express';
import { ProjectManager } from './services/ProjectManager.js';
import { MongoProjectRepository } from '../repositories/MongoProjectRepository.js';

const svc = new ProjectManager(new MongoProjectRepository());
export const projectRoutes = Router();

projectRoutes.patch('/:id', async (req, res, next) => {
  try {
    const updated = await svc.update(req.userId!, req.params.id, req.body);
    res.json(updated);
  } catch (e) { next(e); }
});