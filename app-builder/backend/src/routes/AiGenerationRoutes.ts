import { Router, type RequestHandler } from 'express';
import { AiGenerationController } from '../controllers/AiGenerationController.js';

export function makeAiGenerationRoutes(
  controller: AiGenerationController,
  requireAuth: RequestHandler,
) {
  const router = Router();
  router.get('/:projectId/ai/usage', requireAuth, controller.getUsage);
  router.post('/:projectId/ai/proposals', requireAuth, controller.createProposal);
  router.post('/:projectId/ai/proposals/corrections', requireAuth, controller.correctProposal);
  return router;
}
