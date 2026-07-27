import assert from 'node:assert/strict';
import test from 'node:test';
import type { AppUser } from '../src/models/AppUser.js';
import type {
  AppUserRepository,
  CreateAppUserInput,
} from '../src/repositories/AppUserRepository.js';
import {
  AppDataRecordOwnerViewService,
} from '../src/services/AppDataRecordOwnerViewService.js';
import { serializeAppDataRecord } from '../src/services/AppDataService.js';

class MemoryAppUserRepository implements AppUserRepository {
  findByIdsCalls: Array<{ projectId: string; ids: string[] }> = [];

  constructor(private readonly users: AppUser[]) {}

  async findByEmail(projectId: string, emailNormalized: string) {
    return this.users.find(
      (user) => user.projectId === projectId && user.emailNormalized === emailNormalized,
    ) ?? null;
  }

  async findById(id: string) {
    return this.users.find((user) => String(user.id) === id) ?? null;
  }

  async findByIds(projectId: string, ids: string[]) {
    this.findByIdsCalls.push({ projectId, ids });
    const idSet = new Set(ids);
    return this.users.filter(
      (user) => user.projectId === projectId && idSet.has(String(user.id)),
    );
  }

  async create(input: CreateAppUserInput) {
    const user = createAppUser({ id: `user-${this.users.length + 1}`, ...input });
    this.users.push(user);
    return user;
  }
}

function createAppUser({
  id,
  projectId,
  displayName,
  email,
  emailNormalized = email.toLowerCase(),
  passwordHash = 'private-password-hash',
  createdAt = new Date('2026-07-27T12:00:00.000Z'),
}: {
  id: string;
  projectId: string;
  displayName: string;
  email: string;
  emailNormalized?: string;
  passwordHash?: string;
  createdAt?: Date;
}) {
  return {
    id,
    projectId,
    displayName,
    email,
    emailNormalized,
    passwordHash,
    createdAt,
    updatedAt: createdAt,
  } as AppUser;
}

function createRecord(id: string, ownerAppUserId?: string) {
  return serializeAppDataRecord({
    _id: id,
    collectionId: 'profiles',
    ...(ownerAppUserId ? { ownerAppUserId } : {}),
    data: { displayName: `Profile ${id}` },
    createdAt: new Date('2026-07-27T13:00:00.000Z'),
  });
}

test('owner record views expose safe submitter identity without authentication internals', async () => {
  const users = new MemoryAppUserRepository([
    createAppUser({
      id: 'app-user-1',
      projectId: 'project-1',
      displayName: 'Maya Chen',
      email: 'maya@example.com',
    }),
  ]);
  const service = new AppDataRecordOwnerViewService(users);

  const [record] = await service.serializeRecords('project-1', [
    createRecord('record-1', 'app-user-1'),
  ]);

  assert.deepEqual(record?.submittedBy, {
    type: 'authenticated',
    id: 'app-user-1',
    displayName: 'Maya Chen',
    email: 'maya@example.com',
    createdAt: new Date('2026-07-27T12:00:00.000Z'),
  });
  assert.equal(record && 'ownerAppUserId' in record, false);
  assert.equal(record && 'appUserId' in record, false);
  assert.equal(JSON.stringify(record).includes('private-password-hash'), false);
  assert.equal(JSON.stringify(record).includes('emailNormalized'), false);
});

test('owner record views distinguish anonymous and deleted-user records', async () => {
  const users = new MemoryAppUserRepository([]);
  const service = new AppDataRecordOwnerViewService(users);

  const records = await service.serializeRecords('project-1', [
    createRecord('anonymous-record'),
    createRecord('deleted-user-record', 'missing-user'),
  ]);

  assert.deepEqual(records.map((record) => record.submittedBy), [
    { type: 'anonymous' },
    { type: 'deleted' },
  ]);
  assert.equal(JSON.stringify(records).includes('missing-user'), false);
});

test('owner record attribution batches lookups and does not resolve users from another project', async () => {
  const users = new MemoryAppUserRepository([
    createAppUser({
      id: 'project-1-user',
      projectId: 'project-1',
      displayName: 'Project One User',
      email: 'one@example.com',
    }),
    createAppUser({
      id: 'project-2-user',
      projectId: 'project-2',
      displayName: 'Project Two User',
      email: 'two@example.com',
    }),
  ]);
  const service = new AppDataRecordOwnerViewService(users);

  const records = await service.serializeRecords('project-1', [
    createRecord('record-1', 'project-1-user'),
    createRecord('record-2', 'project-1-user'),
    createRecord('record-3', 'project-2-user'),
  ]);

  assert.equal(users.findByIdsCalls.length, 1);
  assert.deepEqual(new Set(users.findByIdsCalls[0]?.ids), new Set([
    'project-1-user',
    'project-2-user',
  ]));
  assert.equal(records[0]?.submittedBy.type, 'authenticated');
  assert.equal(records[1]?.submittedBy.type, 'authenticated');
  assert.deepEqual(records[2]?.submittedBy, { type: 'deleted' });
  assert.equal(JSON.stringify(records).includes('two@example.com'), false);
});
