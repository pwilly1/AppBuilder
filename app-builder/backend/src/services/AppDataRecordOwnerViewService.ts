import type { AppUserRepository } from '../repositories/AppUserRepository.js';
import type { SerializedAppDataRecord } from './AppDataService.js';

export type AppDataRecordSubmitter =
  | {
      type: 'authenticated';
      id: string;
      displayName: string;
      email: string;
      createdAt?: Date;
    }
  | { type: 'anonymous' }
  | { type: 'deleted' };

export type OwnerSerializedAppDataRecord = Omit<
  SerializedAppDataRecord,
  'ownerAppUserId' | 'appUserId'
> & {
  submittedBy: AppDataRecordSubmitter;
};

export class AppDataRecordOwnerViewService {
  constructor(private readonly users: AppUserRepository) {}

  async serializeRecords(
    projectId: string,
    records: SerializedAppDataRecord[],
  ): Promise<OwnerSerializedAppDataRecord[]> {
    const ownerIds = [...new Set(
      records
        .map((record) => record.ownerAppUserId || record.appUserId)
        .filter((id): id is string => Boolean(id)),
    )];
    const appUsers = ownerIds.length > 0
      ? await this.users.findByIds(projectId, ownerIds)
      : [];
    const appUsersById = new Map(appUsers.map((user) => [String(user.id), user]));

    return records.map((record) => {
      const ownerId = record.ownerAppUserId || record.appUserId;
      const appUser = ownerId ? appUsersById.get(ownerId) : undefined;
      const {
        ownerAppUserId: _ownerAppUserId,
        appUserId: _appUserId,
        ...safeRecord
      } = record;

      return {
        ...safeRecord,
        submittedBy: !ownerId
          ? { type: 'anonymous' }
          : appUser
            ? {
                type: 'authenticated',
                id: String(appUser.id),
                displayName: appUser.displayName || '',
                email: appUser.email,
                ...(appUser.createdAt ? { createdAt: appUser.createdAt } : {}),
              }
            : { type: 'deleted' },
      };
    });
  }

  async serializeRecord(
    projectId: string,
    record: SerializedAppDataRecord,
  ): Promise<OwnerSerializedAppDataRecord> {
    const [serialized] = await this.serializeRecords(projectId, [record]);
    if (!serialized) throw new Error('Unable to serialize app-data record');
    return serialized;
  }
}
