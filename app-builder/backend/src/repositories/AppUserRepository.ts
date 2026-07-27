import type { AppUser } from '../models/AppUser.js';
import { AppUserModel } from '../models/AppUser.js';
import { Types } from 'mongoose';

export type CreateAppUserInput = {
  projectId: string;
  displayName: string;
  email: string;
  emailNormalized: string;
  passwordHash: string;
};

export interface AppUserRepository {
  findByEmail(projectId: string, emailNormalized: string): Promise<AppUser | null>;
  findById(id: string): Promise<AppUser | null>;
  findByIds(projectId: string, ids: string[]): Promise<AppUser[]>;
  create(user: CreateAppUserInput): Promise<AppUser>;
}

export class MongoAppUserRepository implements AppUserRepository {
  findByEmail(projectId: string, emailNormalized: string) {
    return AppUserModel.findOne({ projectId, emailNormalized }).exec();
  }

  findById(id: string) {
    return AppUserModel.findById(id).exec();
  }

  findByIds(projectId: string, ids: string[]) {
    const validIds = [...new Set(ids.map((id) => id.trim()).filter((id) => Types.ObjectId.isValid(id)))];
    if (validIds.length === 0) return Promise.resolve([]);
    return AppUserModel.find({ projectId, _id: { $in: validIds } }).exec();
  }

  create(user: CreateAppUserInput) {
    return AppUserModel.create(user);
  }
}
