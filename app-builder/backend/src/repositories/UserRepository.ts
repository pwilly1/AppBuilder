import { UserModel } from '../models/User';
import type { IUser } from "../models/User";


export interface IUserRepository {
  findByUsername(username: string): Promise<IUser|null>;
  findById(id: string): Promise<IUser|null>;
  create(user: { username: string; email: string; passwordHash: string; }): Promise<IUser>;
}

export class MongoUserRepository implements IUserRepository {
  findByUsername(username: string) {
    return UserModel.findOne({ username }).exec();
  }

  findById(id: string) {
    return UserModel.findById(id).exec();
  }

  create(user: { username: string; email: string; passwordHash: string; }) {
    return UserModel.create(user);
  }
}
