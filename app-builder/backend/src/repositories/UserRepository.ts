// © 2025 Preston Willis. All rights reserved.
import { UserModel } from '../models/User.js';
import type { IUser } from "../models/User.js";
import { normalizeEmail, normalizeUsernameLookup } from '../auth/AuthContracts.js';

export type CreateUserInput = {
  username: string;
  usernameNormalized: string;
  email: string;
  emailNormalized: string;
  passwordHash: string;
  isGuest?: boolean;
};

export interface IUserRepository {
  findByUsername(username: string): Promise<IUser|null>;
  findByEmail(email: string): Promise<IUser|null>;
  findById(id: string): Promise<IUser|null>;
  create(user: CreateUserInput): Promise<IUser>;
}

export class MongoUserRepository implements IUserRepository {
  async findByUsername(username: string) {
    const usernameNormalized = normalizeUsernameLookup(username);
    const normalizedMatch = await UserModel.findOne({ usernameNormalized }).exec();
    if (normalizedMatch) return normalizedMatch;

    return UserModel.findOne({ username })
      .collation({ locale: 'en', strength: 2 })
      .exec();
  }

  async findByEmail(email: string) {
    const emailNormalized = normalizeEmail(email);
    const normalizedMatch = await UserModel.findOne({ emailNormalized }).exec();
    if (normalizedMatch) return normalizedMatch;

    return UserModel.findOne({ email })
      .collation({ locale: 'en', strength: 2 })
      .exec();
  }

  findById(id: string) {
    return UserModel.findById(id).exec();
  }

  create(user: CreateUserInput) {
    return UserModel.create(user);
  }
}
