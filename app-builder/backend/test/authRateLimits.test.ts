import assert from 'node:assert/strict';
import test from 'node:test';
import express, { type RequestHandler } from 'express';
import type { AddressInfo } from 'node:net';
import { AuthController } from '../src/controllers/authController.js';
import { makeAuthRoutes } from '../src/routes/AuthRoutes.js';
import type { AuthService } from '../src/services/AuthService.js';
import { InvalidCredentialsError } from '../src/auth/AuthContracts.js';

test('login endpoints stop repeated requests and return a controlled response', async (context) => {
  const authService = {
    login: async () => { throw new InvalidCredentialsError(); },
    signup: async () => 'test-token',
    guest: async () => 'test-token',
  } as unknown as AuthService;
  const requireAuth: RequestHandler = (_req, _res, next) => next();
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.use('/auth', makeAuthRoutes(new AuthController(authService), requireAuth));

  const server = app.listen(0);
  context.after(() => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  await new Promise<void>((resolve) => server.once('listening', resolve));

  const { port } = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}/auth/login`;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'rate-limit-user', password: 'password-123' }),
    });
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }

  const blocked = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'rate-limit-user', password: 'password-123' }),
  });

  assert.equal(blocked.status, 429);
  assert.deepEqual(await blocked.json(), { error: 'Too many attempts. Please try again later.' });
  assert.ok(blocked.headers.get('retry-after'));
});
