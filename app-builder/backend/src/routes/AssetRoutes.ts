import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import multer from 'multer';
import { AssetController } from '../controllers/AssetController.js';

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

function uploadSingleImage(req: Request, res: Response, next: NextFunction) {
  uploadImage.single('file')(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5 MB or smaller.' : error.message;
      res.status(400).json({ error: message });
      return;
    }
    if (error) return next(error);
    next();
  });
}

export function makeAssetRoutes(controller: AssetController, requireAuth: RequestHandler) {
  const router = Router();
  router.post('/:id/assets/images', requireAuth, uploadSingleImage, controller.uploadProjectImage);
  return router;
}
