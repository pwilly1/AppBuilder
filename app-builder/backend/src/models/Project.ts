// © 2025 Preston Willis. All rights reserved.
import { Schema, model, Document, Types } from 'mongoose';

// Lightweight types for stored pages/blocks. We store them as plain mixed objects
// so the frontend can evolve block schemas without requiring a strict backend model.
export interface ProjectPage {
  id: string;
  title?: string;
  path?: string;
  blocks?: any[];
}

export interface Project extends Document {
  ownerId: string;
  name: string;
  pages?: ProjectPage[];
  updatedAt: Date;
  createdAt: Date;
}

const ProjectSchema = new Schema<Project>(
  {
    ownerId: { type: String, required: true, index: true },
    name:    { type: String, required: true, trim: true },
    pages:   { type: Array as any, default: [] },
  },
  { timestamps: true, versionKey: false }
);

export const ProjectModel = model<Project>('Project', ProjectSchema);