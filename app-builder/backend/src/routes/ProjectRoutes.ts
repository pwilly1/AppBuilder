import { Router, type RequestHandler } from 'express';
import { ProjectController } from '../controllers/ProjectController.js';

export function makeProjectRoutes(controller: ProjectController, requireAuth: RequestHandler) {
  const router = Router();
  router.get('/', requireAuth, controller.list);
  router.post('/', requireAuth, controller.create);
  router.get('/:id', requireAuth, controller.get);
  router.patch('/:id', requireAuth, controller.update);
  router.delete('/:id', requireAuth, controller.delete);
  return router;
}
