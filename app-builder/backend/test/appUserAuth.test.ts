import assert from 'node:assert/strict';
import test from 'node:test';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import {
  AppUserAuthConflictError,
  InvalidAppUserCredentialsError,
} from '../src/auth/AppUserAuthContracts.js';
import type { AppUser } from '../src/models/AppUser.js';
import {
  createOptionalAppUser,
  type AppUserAuthenticatedRequest,
} from '../src/middleware/appUserAuth.js';
import type {
  AppUserRepository,
  CreateAppUserInput,
} from '../src/repositories/AppUserRepository.js';
import { AppUserAuthService } from '../src/services/AppUserAuthService.js';
import { AppUserTokenService } from '../src/services/AppUserTokenService.js';

const TEST_SECRET = 'app-user-test-secret-that-is-long-enough';

class MemoryAppUserRepository implements AppUserRepository {
  readonly users: AppUser[] = [];

  async findByEmail(projectId: string, emailNormalized: string) {
    return this.users.find(
      (user) => user.projectId === projectId && user.emailNormalized === emailNormalized,
    ) ?? null;
  }

  async findById(id: string) {
    return this.users.find((user) => String(user.id) === id) ?? null;
  }

  async create(input: CreateAppUserInput) {
    const user = {
      ...input,
      id: `app-user-${this.users.length + 1}`,
      createdAt: new Date('2026-07-23T12:00:00.000Z'),
      updatedAt: new Date('2026-07-23T12:00:00.000Z'),
    } as unknown as AppUser;
    this.users.push(user);
    return user;
  }
}

function createService() {
  const repository = new MemoryAppUserRepository();
  const tokens = new AppUserTokenService(TEST_SECRET);
  return {
    repository,
    tokens,
    service: new AppUserAuthService(repository, tokens),
  };
}

test('generated-app signup normalizes email and stores a password hash', async () => {
  const { repository, service, tokens } = createService();

  const result = await service.signup(
    'project-1',
    '  Field User  ',
    '  PERSON@Example.COM ',
    'password-123',
  );

  const stored = repository.users[0];
  assert.equal(stored?.projectId, 'project-1');
  assert.equal(stored?.displayName, 'Field User');
  assert.equal(stored?.email, 'person@example.com');
  assert.equal(await bcrypt.compare('password-123', stored?.passwordHash ?? ''), true);
  assert.equal(tokens.verifyToken(result.token).projectId, 'project-1');
  assert.equal(result.user.email, 'person@example.com');
  assert.equal('passwordHash' in result.user, false);
});

test('generated-app email uniqueness is scoped to one project', async () => {
  const { service } = createService();

  await service.signup('project-1', '', 'person@example.com', 'password-123');
  await assert.rejects(
    service.signup('project-1', '', 'PERSON@example.com', 'password-456'),
    AppUserAuthConflictError,
  );

  const secondApp = await service.signup(
    'project-2',
    '',
    'person@example.com',
    'password-456',
  );
  assert.equal(secondApp.user.projectId, 'project-2');
});

test('generated-app login hides unknown-account and wrong-password differences', async () => {
  const { service } = createService();
  await service.signup('project-1', '', 'person@example.com', 'password-123');

  for (const attempt of [
    service.login('project-1', 'missing@example.com', 'password-123'),
    service.login('project-1', 'person@example.com', 'incorrect-password'),
    service.login('project-2', 'person@example.com', 'password-123'),
  ]) {
    await assert.rejects(
      attempt,
      (error: unknown) => error instanceof InvalidAppUserCredentialsError
        && error.message === 'Invalid email or password.',
    );
  }
});

test('app-user tokens are project scoped and reject builder-token payloads', () => {
  const tokens = new AppUserTokenService(TEST_SECRET);
  const token = tokens.createToken('project-1', 'app-user-1');
  assert.deepEqual(
    {
      appUserId: tokens.verifyToken(token).appUserId,
      projectId: tokens.verifyToken(token).projectId,
      tokenType: tokens.verifyToken(token).tokenType,
    },
    {
      appUserId: 'app-user-1',
      projectId: 'project-1',
      tokenType: 'app-user',
    },
  );

  const builderToken = jwt.sign({ userId: 'builder-1' }, TEST_SECRET, { expiresIn: '1h' });
  assert.throws(() => tokens.verifyToken(builderToken), /Invalid app-user token payload/);
});

test('optional app-user auth fails closed for an explicit invalid runtime token', async () => {
  const { repository, tokens } = createService();
  const middleware = createOptionalAppUser(tokens, repository);
  let statusCode = 200;
  let body: unknown;
  let nextCalled = false;
  const response = {
    status(code: number) {
      statusCode = code;
      return response;
    },
    json(value: unknown) {
      body = value;
      return response;
    },
  } as unknown as Response;

  await middleware({
    params: { id: 'project-1' },
    headers: { 'x-apptura-app-user-token': 'invalid-token' },
  } as unknown as Request, response, (() => { nextCalled = true; }) as NextFunction);

  assert.equal(statusCode, 401);
  assert.deepEqual(body, { error: 'Invalid or expired app-user session' });
  assert.equal(nextCalled, false);
});

test('optional app-user auth preserves legacy builder-token submissions', async () => {
  const { repository, tokens } = createService();
  const middleware = createOptionalAppUser(tokens, repository);
  let nextCalled = false;
  const response = {} as Response;
  const builderToken = jwt.sign({ userId: 'builder-1' }, TEST_SECRET, { expiresIn: '1h' });

  await middleware({
    params: { id: 'project-1' },
    headers: { authorization: `Bearer ${builderToken}` },
  } as unknown as Request, response, (() => { nextCalled = true; }) as NextFunction);

  assert.equal(nextCalled, true);
});

test('optional app-user auth attaches only users from the token project', async () => {
  const { repository, service, tokens } = createService();
  const session = await service.signup('project-1', '', 'person@example.com', 'password-123');
  const middleware = createOptionalAppUser(tokens, repository);
  let nextCalled = false;
  const request = {
    params: { id: 'project-1' },
    headers: { 'x-apptura-app-user-token': session.token },
  } as unknown as Request;

  await middleware(
    request,
    {} as Response,
    (() => { nextCalled = true; }) as NextFunction,
  );

  assert.equal(nextCalled, true);
  assert.equal((request as AppUserAuthenticatedRequest).appUserId, session.user.id);
});
