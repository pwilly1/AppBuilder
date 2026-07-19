import assert from 'node:assert/strict';
import test from 'node:test';
import bcrypt from 'bcryptjs';
import type { IUser } from '../src/models/User.js';
import type { CreateUserInput, IUserRepository } from '../src/repositories/UserRepository.js';
import {
  AuthConflictError,
  AuthValidationError,
  InvalidCredentialsError,
  normalizeEmail,
  normalizeUsernameLookup,
  validateSignupCredentials,
} from '../src/auth/AuthContracts.js';
import { AuthService } from '../src/services/AuthService.js';
import { JwtService } from '../src/services/JwtService.js';

type StoredUser = CreateUserInput & { id: string };

class InMemoryUserRepository implements IUserRepository {
  readonly users: StoredUser[] = [];

  async findByUsername(username: string) {
    const normalized = normalizeUsernameLookup(username);
    return this.asUser(this.users.find((user) => user.usernameNormalized === normalized));
  }

  async findByEmail(email: string) {
    const normalized = normalizeEmail(email);
    return this.asUser(this.users.find((user) => user.emailNormalized === normalized));
  }

  async findById(id: string) {
    return this.asUser(this.users.find((user) => user.id === id));
  }

  async create(input: CreateUserInput) {
    const user = { ...input, id: `user-${this.users.length + 1}` };
    this.users.push(user);
    return this.asUser(user) as IUser;
  }

  private asUser(user: StoredUser | undefined): IUser | null {
    return user ? user as unknown as IUser : null;
  }
}

function createService(repository = new InMemoryUserRepository()) {
  return {
    repository,
    tokens: new JwtService('test-secret-that-is-long-enough'),
    service: new AuthService(repository, new JwtService('test-secret-that-is-long-enough')),
  };
}

test('signup normalizes identifiers and hashes the password before storage', async () => {
  const { repository, service, tokens } = createService();
  const token = await service.signup('  Test_User  ', '  PERSON@Example.COM ', 'password-123');

  assert.equal(repository.users.length, 1);
  const stored = repository.users[0];
  assert.equal(stored?.username, 'Test_User');
  assert.equal(stored?.usernameNormalized, 'test_user');
  assert.equal(stored?.email, 'person@example.com');
  assert.equal(stored?.emailNormalized, 'person@example.com');
  assert.equal(await bcrypt.compare('password-123', stored?.passwordHash ?? ''), true);
  assert.equal(tokens.verifyToken(token).userId, stored?.id);
});

test('signup rejects an existing username or email with the same controlled error', async () => {
  const { service } = createService();
  await service.signup('First_User', 'first@example.com', 'password-123');

  await assert.rejects(
    service.signup('first_user', 'different@example.com', 'password-456'),
    (error: unknown) => error instanceof AuthConflictError,
  );
  await assert.rejects(
    service.signup('different_user', 'FIRST@example.com', 'password-456'),
    (error: unknown) => error instanceof AuthConflictError,
  );
});

test('unknown users and incorrect passwords produce the same login error', async () => {
  const { service } = createService();
  await service.signup('real_user', 'real@example.com', 'password-123');

  for (const attempt of [
    service.login('missing_user', 'password-123'),
    service.login('real_user', 'incorrect-password'),
  ]) {
    await assert.rejects(
      attempt,
      (error: unknown) => error instanceof InvalidCredentialsError
        && error.message === 'Invalid username or password.',
    );
  }
});

test('signup validation rejects malformed or oversized values', () => {
  assert.throws(
    () => validateSignupCredentials('bad username', 'person@example.com', 'password-123'),
    AuthValidationError,
  );
  assert.throws(
    () => validateSignupCredentials('valid-user', 'not-an-email', 'password-123'),
    AuthValidationError,
  );
  assert.throws(
    () => validateSignupCredentials('valid-user', 'person@example.com', 'short'),
    AuthValidationError,
  );
  assert.throws(
    () => validateSignupCredentials('valid-user', 'person@example.com', 'x'.repeat(73)),
    AuthValidationError,
  );
});
