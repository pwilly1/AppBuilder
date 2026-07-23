import { Document, Schema, model } from 'mongoose';

export interface AppUser extends Document {
  projectId: string;
  displayName: string;
  email: string;
  emailNormalized: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const AppUserSchema = new Schema<AppUser>(
  {
    projectId: { type: String, required: true, index: true },
    displayName: { type: String, default: '', trim: true },
    email: { type: String, required: true, trim: true },
    emailNormalized: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true, versionKey: false },
);

AppUserSchema.index({ projectId: 1, emailNormalized: 1 }, { unique: true });

export const AppUserModel = model<AppUser>('AppUser', AppUserSchema);
