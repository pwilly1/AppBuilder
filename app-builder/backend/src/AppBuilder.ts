import { ProjectManager } from './services/ProjectManager.js';

export class AppBuilder {
  constructor(private readonly projects: ProjectManager) {}

  async createNewApp(ownerId: string, projectName: string, options: Record<string, unknown> = {}) {
    if (!projectName) throw new Error('projectName is required');
    return this.projects.create(projectName, { ...options, ownerId });
  }

  async deleteApp(ownerId: string, projectId: string): Promise<void> {
    if (!projectId) throw new Error('projectId is required');
    await this.projects.deleteOwned(ownerId, projectId);
  }

  async editApp(ownerId: string, projectId: string, updates: Record<string, unknown>) {
    if (!projectId) throw new Error('projectId is required');
    return this.projects.update(ownerId, projectId, updates);
  }
}
