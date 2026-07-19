// © 2025 Preston Willis. All rights reserved.
import { Router, type RequestHandler } from 'express';
import { AuthController } from '../controllers/authController.js';
import {
  guestSessionRateLimit,
  loginAccountRateLimit,
  loginIpRateLimit,
  signupRateLimit,
} from '../middleware/authRateLimits.js';

export function makeAuthRoutes(ctrl: AuthController, requireAuth: RequestHandler) {
  const router = Router();

  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // POST /auth/signup
  router.post('/signup', signupRateLimit, ctrl.signup.bind(ctrl));

  // POST /auth/login
  router.post('/login', loginIpRateLimit, loginAccountRateLimit, ctrl.login.bind(ctrl));

  // Android currently uses this compatibility endpoint to start preview sessions.
  router.get('/createGuestSession', guestSessionRateLimit, ctrl.guest.bind(ctrl));

  router.get('/health', (_, res) => res.json({ ok: true }));

  router.get('/me', requireAuth, ctrl.me.bind(ctrl));

  return router;
}
