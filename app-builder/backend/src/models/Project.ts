// © 2025 Preston Willis. All rights reserved.
import { Schema, model, Document } from 'mongoose';

// Lightweight types for stored pages/blocks. We store them as plain mixed objects
// so the frontend can evolve block schemas without requiring a strict backend model.
export interface ProjectPage {
  id: string;
  title?: string;
  path?: string;
  appearance?: {
    backgroundColor?: string;
  };
  blocks?: any[];
}

export interface ProjectDataCollectionField {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'email' | 'date';
  required?: boolean;
}

export interface ProjectDataCollectionAccess {
  create: 'anyone' | 'authenticated';
  read: 'public' | 'own' | 'none';
  update: 'own' | 'none';
  delete: 'own' | 'none';
}

export interface ProjectDataCollection {
  id: string;
  name: string;
  publicRead: boolean;
  access?: ProjectDataCollectionAccess;
  fields: ProjectDataCollectionField[];
}

export interface Project extends Document {
  ownerId: string;
  schemaVersion?: number;
  name: string;
  pages?: ProjectPage[];
  dataCollections?: ProjectDataCollection[];
  updatedAt: Date;
  createdAt: Date;
}

const ProjectSchema = new Schema<Project>(
  {
    ownerId: { type: String, required: true, index: true },
    schemaVersion: { type: Number, default: 2 },
    name:    { type: String, required: true, trim: true },
    pages:   { type: Array as any, default: [] },
    dataCollections: { type: Array as any, default: [] },
  },
  { timestamps: true, versionKey: false }
);

export const ProjectModel = model<Project>('Project', ProjectSchema);
