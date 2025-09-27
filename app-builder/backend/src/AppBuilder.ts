import { ProjectManager } from './services/ProjectManager.js';

export class AppBuilder {
  projMan: ProjectManager;

  constructor(projMan: ProjectManager) {
    this.projMan = projMan;
  }

  async createNewApp(projectName: string, options?: Record<string, any>): Promise<any> {
    if (!projectName) throw new Error('projectName is required');
    if (typeof (this.projMan as any).create === 'function') {
      return (this.projMan as any).create(projectName, options);
    }
    throw new Error('ProjectManager.create is not implemented');
  }

  async deleteApp(projectId: string): Promise<void> {
    if (!projectId) throw new Error('projectId is required');
    if (typeof (this.projMan as any).delete === 'function') {
      await (this.projMan as any).delete(projectId);
      return;
    }
    if (typeof (this.projMan as any).remove === 'function') {
      await (this.projMan as any).remove(projectId);
      return;
    }
    throw new Error('No delete/remove method found on ProjectManager');
  }

  async editApp(projectId: string, updates: Record<string, any>): Promise<any> {
    if (!projectId) throw new Error('projectId is required');
    if (typeof (this.projMan as any).update === 'function') {
      return (this.projMan as any).update(projectId, updates);
    }
    throw new Error('ProjectManager.update is not implemented');
  }

  async deployApp(projectId: string): Promise<any> {
    if (!projectId) throw new Error('projectId is required');
    if (typeof (this.projMan as any).deploy === 'function') {
      return (this.projMan as any).deploy(projectId);
    }
    throw new Error('ProjectManager.deploy is not implemented');
  }
}