import { Project } from '../models/Project.js';

export interface ProjectRepository {
  listByOwner(ownerId: string): Promise<Project[]>; // this will returns all projects that belong to a given user. Ideal place to add pagination/sorting later.
  findById(id: string): Promise<Project | null>; // looks for project by id
  create(p: Project): Promise<Project>; // create new project
  update(p: Project): Promise<Project>; // saves project
  delete(id: string): Promise<void>; // deletes project by id
}