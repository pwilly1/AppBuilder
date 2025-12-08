// © 2025 Preston Willis. All rights reserved.
import mongoose from 'mongoose';
import { Project, ProjectModel } from '../models/Project.js';
import { ProjectRepository } from './ProjectRepository.js';

export class MongoProjectRepository implements ProjectRepository {
  async listByOwner(ownerId: string): Promise<Project[]> {
    const docs = await ProjectModel
      .find({ ownerId })
      .sort({ updatedAt: -1 })
      .exec();
    return docs.map(d => {
      const obj = d.toObject();
      (obj as any).id = (d as any)._id?.toString?.() ?? String((d as any)._id);
      return obj as any;
    });
  }

  async findById(id: string): Promise<Project | null> {
    // avoid Mongoose CastError when id is not a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await ProjectModel.findById(id).exec();
    if (!doc) return null;
    const obj = doc.toObject();
  (obj as any).id = (doc as any)._id?.toString?.() ?? String((doc as any)._id);
    return obj as any;
  }

  async create(p: Project): Promise<Project> {
    // If p is a plain object, let Mongoose create the doc
    const doc = await ProjectModel.create(p);
    const obj = doc.toObject();
  (obj as any).id = (doc as any)._id?.toString?.() ?? String((doc as any)._id);
    return obj as any;
  }

  async update(p: Project): Promise<Project> {
    // ensure id is a valid ObjectId before attempting update
    if (!mongoose.Types.ObjectId.isValid(p.id)) throw new Error('Invalid project id');
    // Persist the full project object (except `id` which maps to _id).
    // Use a defensive merge so callers can send partial updates but the
    // repository will persist the merged/complete object.
    const { id, ...rest } = p as any;
    const updated = await ProjectModel
      .findByIdAndUpdate(p.id, rest, { new: true })
      .exec();
    if (!updated) throw new Error('Project not found');
    const obj = updated.toObject();
  (obj as any).id = (updated as any)._id?.toString?.() ?? String((updated as any)._id);
    return obj as any;
  }

  async delete(id: string): Promise<void> {
    await ProjectModel.findByIdAndDelete(id).exec();
  }
}
