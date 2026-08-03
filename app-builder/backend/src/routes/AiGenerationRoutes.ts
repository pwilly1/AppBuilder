import { Router, type RequestHandler } from 'express';
import { AiGenerationController } from '../controllers/AiGenerationController.js';

export function makeAiGenerationRoutes(
  controller: AiGenerationController,
  requireAuth: RequestHandler,
) {
  const router = Router();
  router.post('/:projectId/ai/proposals', requireAuth, controller.createProposal);
  return router;
}
