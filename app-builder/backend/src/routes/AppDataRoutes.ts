import { Router, type RequestHandler } from 'express';
import { AppDataController } from '../controllers/AppDataController.js';

export function makeAppDataRoutes(controller: AppDataController, requireAuth: RequestHandler) {
  const router = Router();
  router.get('/:id/forms/:blockId/submissions', requireAuth, controller.listLegacySubmissions);
  router.get('/:id/app-data/sources', requireAuth, controller.listSources);
  router.get('/:id/app-data/sources/:sourceId/records.csv', requireAuth, controller.exportRecordsCsv);
  router.get('/:id/app-data/sources/:sourceId/records', requireAuth, controller.listRecords);
  router.post('/:id/forms/:blockId/submissions', requireAuth, controller.submitOwnedLegacy);
  return router;
}

export function makePublicAppDataRoutes(controller: AppDataController) {
  const router = Router();
  router.get('/projects/:id/app-data/collections/:collectionId/records/latest', controller.getLatestPublicCollectionRecord);
  router.get('/projects/:id/app-data/collections/:collectionId/records/:recordId', controller.getPublicCollectionRecord);
  router.post('/projects/:id/forms/:blockId/submissions', controller.submitPublicLegacy);
  router.post('/projects/:id/app-data/sources/:sourceId/records', controller.submitPublicRecord);
  return router;
}
