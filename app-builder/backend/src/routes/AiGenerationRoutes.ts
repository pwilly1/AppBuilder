import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import multer from 'multer';
import { AiGenerationController } from '../controllers/AiGenerationController.js';
import { AI_VISUAL_REVIEW_MAX_IMAGE_BYTES } from '../ai/AiGenerationRequest.js';

const uploadVisualPreview = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: AI_VISUAL_REVIEW_MAX_IMAGE_BYTES,
    files: 1,
    fields: 3,
    fieldSize: 256 * 1024,
  },
});

function uploadSingleVisualPreview(req: Request, res: Response, next: NextFunction) {
  uploadVisualPreview.single('preview')(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'Rendered preview image must be 2 MB or smaller.'
        : error.message;
      res.status(400).json({ error: message });
      return;
    }
    if (error) return next(error);
    next();
  });
}

export function makeAiGenerationRoutes(
  controller: AiGenerationController,
  requireAuth: RequestHandler,
) {
  const router = Router();
  router.get('/:projectId/ai/usage', requireAuth, controller.getUsage);
  router.post('/:projectId/ai/proposals', requireAuth, controller.createProposal);
  router.post('/:projectId/ai/proposals/corrections', requireAuth, controller.correctProposal);
  router.post(
    '/:projectId/ai/proposals/visual-reviews',
    requireAuth,
    uploadSingleVisualPreview,
    controller.reviewVisualProposal,
  );
  return router;
}
