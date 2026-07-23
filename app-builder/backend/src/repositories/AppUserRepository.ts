import type { AppUser } from '../models/AppUser.js';
import { AppUserModel } from '../models/AppUser.js';

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
  create(user: CreateAppUserInput): Promise<AppUser>;
}

export class MongoAppUserRepository implements AppUserRepository {
  findByEmail(projectId: string, emailNormalized: string) {
    return AppUserModel.findOne({ projectId, emailNormalized }).exec();
  }

  findById(id: string) {
    return AppUserModel.findById(id).exec();
  }

  create(user: CreateAppUserInput) {
    return AppUserModel.create(user);
  }
}
