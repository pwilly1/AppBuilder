import { Router, type RequestHandler } from 'express';
import { AppUserController } from '../controllers/AppUserController.js';
import { loginIpRateLimit, signupRateLimit } from '../middleware/authRateLimits.js';

export function makePublicAppUserRoutes(
  controller: AppUserController,
  requireAppUser: RequestHandler,
) {
  const router = Router();

  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  router.post('/projects/:id/app-auth/signup', signupRateLimit, controller.signup);
  router.post('/projects/:id/app-auth/login', loginIpRateLimit, controller.login);
  router.get('/projects/:id/app-auth/me', requireAppUser, controller.me);
  router.post('/projects/:id/app-auth/logout', requireAppUser, controller.logout);

  return router;
}
