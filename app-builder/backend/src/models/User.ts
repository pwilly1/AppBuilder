import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash: string;
}

const userSchema = new Schema<IUser>({
  username:    { type: String, required: true, unique: true },
  email:       { type: String, required: true, unique: true },
  passwordHash:{ type: String, required: true }
}, { timestamps: true });

export const UserModel = model<IUser>('User', userSchema);
