// © 2025 Preston Willis. All rights reserved.
import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  usernameNormalized?: string;
  email: string;
  emailNormalized?: string;
  passwordHash: string;
  isGuest?: boolean;
}

const userSchema = new Schema<IUser>({
  username:    { type: String, required: true, unique: true },
  usernameNormalized: { type: String, unique: true, sparse: true },
  email:       { type: String, required: true, unique: true },
  emailNormalized: { type: String, unique: true, sparse: true },
  passwordHash:{ type: String, required: true },
  isGuest:     { type: Boolean, default: false },
}, { timestamps: true });

export const UserModel = model<IUser>('User', userSchema);
