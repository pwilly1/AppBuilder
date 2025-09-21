export class ProjectManager {
  repo: any;

  constructor(repo: any) {
    this.repo = repo;
  }

  async create(projectName: string, options: Record<string, any> = {}): Promise<any> {
    if (!projectName) throw new Error('projectName is required');
    const payload = { name: projectName, ...options };
    if (typeof this.repo.create === 'function') {
      return await this.repo.create(payload);
    }
    // fallback: return payload with a generated id
    return { id: Date.now().toString(), ...payload };
  }

  // Support both delete and remove repository method names
  async delete(projectId: string): Promise<void> {
    if (!projectId) throw new Error('projectId is required');
    if (typeof this.repo.delete === 'function') {
      await this.repo.delete(projectId);
      return;
    }
    if (typeof this.repo.remove === 'function') {
      await this.repo.remove(projectId);
      return;
    }
    throw new Error('Repository does not implement delete/remove');
  }

  async remove(projectId: string): Promise<void> {
    return this.delete(projectId);
  }

  /**
   * update(userId, projectId, updates) OR update(projectId, updates)
   */
  async update(...args: any[]): Promise<any> {
    let userId: string | undefined;
    let projectId: string;
    let updates: Record<string, any>;

    if (args.length === 3) {
      [userId, projectId, updates] = args;
    } else if (args.length === 2) {
      [projectId, updates] = args;
    } else {
      throw new Error('Invalid arguments to update');
    }

    if (!projectId) throw new Error('projectId is required');
    if (!updates || typeof updates !== 'object') throw new Error('updates are required');

    // optional ownership check
    if (userId && typeof this.repo.findById === 'function') {
      const existing = await this.repo.findById(projectId);
      if (!existing) throw new Error('Project not found');
      if (existing.ownerId && existing.ownerId !== userId) {
        throw new Error('Not authorized to update this project');
      }
    }

    if (typeof this.repo.update === 'function') {
      return await this.repo.update(projectId, updates);
    }
    if (typeof this.repo.patch === 'function') {
      return await this.repo.patch(projectId, updates);
    }

    // naive in-memory-like fallback
    if (typeof this.repo.findById === 'function') {
      const existing = await this.repo.findById(projectId);
      if (!existing) throw new Error('Project not found');
      const merged = { ...existing, ...updates };
      if (typeof this.repo.save === 'function') {
        await this.repo.save(merged);
      }
      return merged;
    }

    throw new Error('Repository does not implement update/patch');
  }

  async deploy(projectId: string): Promise<any> {
    if (!projectId) throw new Error('projectId is required');
    if (typeof this.repo.deploy === 'function') {
      return await this.repo.deploy(projectId);
    }
    // default deploy behaviour: mark deployed and return status
    let project = undefined;
    if (typeof this.repo.findById === 'function') {
      project = await this.repo.findById(projectId);
      if (!project) throw new Error('Project not found');
      project.deployed = true;
      if (typeof this.repo.save === 'function') await this.repo.save(project);
    }
    return { id: projectId, status: 'deployed', project };
  }
}