import type { IUserRepository } from '../repositories/UserRepository.js';
import type { ProjectPage } from '../models/Project.js';
import type {
  CreateProjectInput,
  ProjectRecord,
  ProjectRepository,
} from '../repositories/ProjectRepository.js';

export class ProjectNotFoundError extends Error {
  constructor() {
    super('Project not found');
  }
}

export class ProjectPermissionError extends Error {}

export class ProjectManager {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly users: IUserRepository,
  ) {}

  listOwned(ownerId: string): Promise<ProjectRecord[]> {
    if (!ownerId) throw new ProjectPermissionError('Missing project owner');
    return this.projects.listByOwner(ownerId);
  }

  findById(projectId: string): Promise<ProjectRecord | null> {
    if (!projectId) return Promise.resolve(null);
    return this.projects.findById(projectId);
  }

  async findOwned(projectId: string, ownerId: string): Promise<ProjectRecord | null> {
    const project = await this.findById(projectId);
    if (!project || project.ownerId !== ownerId) return null;
    return project;
  }

  async create(projectName: string, options: Record<string, unknown> = {}): Promise<ProjectRecord> {
    if (!projectName) throw new Error('projectName is required');
    const ownerId = typeof options.ownerId === 'string' ? options.ownerId : '';
    if (!ownerId) throw new ProjectPermissionError('Project owner is required');
    await this.assertRegisteredUser(ownerId, 'Guests cannot create projects');

    const payload: CreateProjectInput = {
      ownerId,
      name: projectName,
      ...(typeof options.schemaVersion === 'number' ? { schemaVersion: options.schemaVersion } : {}),
      ...(Array.isArray(options.pages) ? { pages: options.pages as ProjectPage[] } : {}),
    };
    return this.projects.create(payload);
  }

  async update(ownerId: string, projectId: string, updates: Record<string, unknown>): Promise<ProjectRecord> {
    if (!projectId) throw new Error('projectId is required');
    if (!updates || typeof updates !== 'object') throw new Error('updates are required');
    await this.assertRegisteredUser(ownerId, 'Guests cannot update projects');

    const existing = await this.findOwned(projectId, ownerId);
    if (!existing) throw new ProjectNotFoundError();

    const merged: ProjectRecord = {
      ...existing,
      id: existing.id,
      ownerId: existing.ownerId,
      name: typeof updates.name === 'string' ? updates.name : existing.name,
      ...(typeof updates.schemaVersion === 'number' ? { schemaVersion: updates.schemaVersion } : {}),
      ...(Array.isArray(updates.pages) ? { pages: updates.pages as ProjectPage[] } : {}),
    };
    return this.projects.update(merged);
  }

  async deleteOwned(ownerId: string, projectId: string): Promise<void> {
    await this.assertRegisteredUser(ownerId, 'Guests cannot delete projects');
    const existing = await this.findOwned(projectId, ownerId);
    if (!existing) throw new ProjectNotFoundError();
    await this.projects.delete(projectId);
  }

  private async assertRegisteredUser(userId: string, guestMessage: string): Promise<void> {
    if (!userId) throw new ProjectPermissionError('Missing user');
    const user = await this.users.findById(userId);
    if (!user) throw new ProjectPermissionError('User not found');
    if (user.isGuest) throw new ProjectPermissionError(guestMessage);
  }
}
