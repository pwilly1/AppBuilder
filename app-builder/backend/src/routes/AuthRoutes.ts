import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js'; 

export function makeAuthRoutes(ctrl: AuthController) {
  const router = Router();

  // POST /auth/signup
  router.post('/signup', ctrl.signup.bind(ctrl));

  // POST /auth/login
  router.post('/login', ctrl.login.bind(ctrl));

  // allow guest session creation by GET (frontend calls GET '/auth/createGuestSession')
  router.get('/createGuestSession', ctrl.guest.bind(ctrl));

  // (optional) health check for debugging
  router.get('/health', (_, res) => res.json({ ok: true }));

  

  return router;
}
