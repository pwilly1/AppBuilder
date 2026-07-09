import {
  collectDynamicFormFields,
  createAppDataRecord,
  findAppDataSource,
  listAppDataRecords,
} from './AppDataService.js';

type ProjectLike = Parameters<typeof findAppDataSource>[0];

export type SerializedAppSubmission = Awaited<ReturnType<typeof createAppDataRecord>>;

export function findDynamicFormBlock(project: ProjectLike, blockId: string) {
  return findAppDataSource(project, blockId);
}

export { collectDynamicFormFields };

export function createDynamicFormSubmission(project: ProjectLike, formBlockId: string, body: unknown) {
  return createAppDataRecord(project, formBlockId, body);
}

export function listDynamicFormSubmissions(ownerId: string, projectId: string, formBlockId: string, project?: ProjectLike) {
  if (!project) {
    throw new Error('Project is required when listing app data records.');
  }
  return listAppDataRecords(project, ownerId, projectId, formBlockId);
}
