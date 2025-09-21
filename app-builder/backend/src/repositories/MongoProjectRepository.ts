import { Project, ProjectModel } from '../models/Project.js';
import { ProjectRepository } from './ProjectRepository.js';

export class MongoProjectRepository implements ProjectRepository {
  async listByOwner(ownerId: string): Promise<Project[]> {
    return ProjectModel
      .find({ ownerId })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<Project | null> {
    return ProjectModel.findById(id).exec();
  }

  async create(p: Project): Promise<Project> {
    // If p is a plain object, let Mongoose create the doc
    return ProjectModel.create(p);
  }

  async update(p: Project): Promise<Project> {
    const updated = await ProjectModel
      .findByIdAndUpdate(p.id, { name: p.name, ownerId: p.ownerId }, { new: true })
      .exec();
    if (!updated) throw new Error('Project not found');
    return updated;
  }

  async delete(id: string): Promise<void> {
    await ProjectModel.findByIdAndDelete(id).exec();
  }
}
