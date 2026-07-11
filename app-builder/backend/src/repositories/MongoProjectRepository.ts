// © 2025 Preston Willis. All rights reserved.
import mongoose from 'mongoose';
import { ProjectModel } from '../models/Project.js';
import type { CreateProjectInput, ProjectRecord, ProjectRepository } from './ProjectRepository.js';

function toProjectRecord(document: InstanceType<typeof ProjectModel>): ProjectRecord {
  const raw = document.toObject() as unknown as Record<string, unknown>;
  const { _id, ...project } = raw;
  return {
    ...project,
    id: String(_id),
  } as ProjectRecord;
}

export class MongoProjectRepository implements ProjectRepository {
  async listByOwner(ownerId: string): Promise<ProjectRecord[]> {
    const docs = await ProjectModel
      .find({ ownerId })
      .sort({ updatedAt: -1 })
      .exec();
    return docs.map(toProjectRecord);
  }

  async findById(id: string): Promise<ProjectRecord | null> {
    // avoid Mongoose CastError when id is not a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await ProjectModel.findById(id).exec();
    if (!doc) return null;
    return toProjectRecord(doc);
  }

  async create(project: CreateProjectInput): Promise<ProjectRecord> {
    const doc = await ProjectModel.create(project);
    return toProjectRecord(doc);
  }

  async update(project: ProjectRecord): Promise<ProjectRecord> {
    if (!mongoose.Types.ObjectId.isValid(project.id)) throw new Error('Invalid project id');
    const { id, ...rest } = project;
    const updated = await ProjectModel
      .findByIdAndUpdate(id, rest, { new: true })
      .exec();
    if (!updated) throw new Error('Project not found');
    return toProjectRecord(updated);
  }

  async delete(id: string): Promise<void> {
    await ProjectModel.findByIdAndDelete(id).exec();
  }
}
