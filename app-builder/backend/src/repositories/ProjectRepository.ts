import type { ProjectPage } from '../models/Project.js';

export interface ProjectRecord {
  id: string;
  ownerId: string;
  name: string;
  schemaVersion?: number;
  pages?: ProjectPage[];
  createdAt?: Date;
  updatedAt?: Date;
}

export type CreateProjectInput = Omit<ProjectRecord, 'id' | 'createdAt' | 'updatedAt'>;

export interface ProjectRepository {
  listByOwner(ownerId: string): Promise<ProjectRecord[]>;
  findById(id: string): Promise<ProjectRecord | null>;
  create(project: CreateProjectInput): Promise<ProjectRecord>;
  update(project: ProjectRecord): Promise<ProjectRecord>;
  delete(id: string): Promise<void>;
}
