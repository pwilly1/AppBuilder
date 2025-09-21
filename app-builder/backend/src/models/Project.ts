import { Schema, model, Document } from 'mongoose';

export interface Project extends Document {
  ownerId: string;
  name: string;
  updatedAt: Date;
  createdAt: Date;
}

const ProjectSchema = new Schema<Project>(
  {
    ownerId: { type: String, required: true, index: true },
    name:    { type: String, required: true, trim: true },
  },
  { timestamps: true, versionKey: false }
);

export const ProjectModel = model<Project>('Project', ProjectSchema);