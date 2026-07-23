import { isValidObjectId, type FilterQuery } from 'mongoose';
import {
  AppDataRecordModel,
  type AppDataRecord,
  type AppDataRecordValue,
} from '../models/AppDataRecord.js';

type ProjectLike = {
  id?: string;
  _id?: unknown;
  ownerId?: string;
  name?: string;
  pages?: Array<{
    id: string;
    title?: string;
    blocks?: BlockLike[];
  }>;
  dataCollections?: CollectionLike[];
};

type CollectionLike = {
  id: string;
  name?: string;
  publicRead?: boolean;
  access?: Partial<AppDataCollectionAccess>;
  fields?: Array<{
    id?: string;
    key?: string;
    label?: string;
    type?: string;
    required?: boolean;
  }>;
};

export type AppDataCollectionAccess = {
  create: 'anyone' | 'authenticated';
  read: 'public' | 'own' | 'none';
  update: 'own' | 'none';
  delete: 'own' | 'none';
};

type BlockLike = {
  id: string;
  type: string;
  parentId?: string;
  props?: Record<string, any>;
};

type AppDataSourceMatch = {
  id: string;
  sourceId: string;
  blockId: string;
  type: 'collection' | 'button' | 'form' | 'contactForm';
  name: string;
  pageId: string;
  pageTitle: string;
  block?: BlockLike;
  pageBlocks: BlockLike[];
  fields: AppDataFieldDefinition[];
  publicRead: boolean;
  access: AppDataCollectionAccess;
};

export type AppDataFieldDefinition = {
  blockId: string;
  type: 'checkbox' | 'toggle' | 'text' | 'number' | 'email' | 'phone' | 'date' | 'boolean';
  key: string;
  label: string;
  required: boolean;
};

export type AppDataSourceSummary = {
  id: string;
  sourceId: string;
  blockId: string;
  type: AppDataSourceMatch['type'];
  name: string;
  pageId: string;
  pageTitle: string;
  fields: AppDataFieldDefinition[];
  recordCount: number;
  access: AppDataCollectionAccess;
};

const LEGACY_SOURCE_ACCESS: AppDataCollectionAccess = {
  create: 'anyone',
  read: 'none',
  update: 'none',
  delete: 'none',
};

export type SerializedAppDataRecord = {
  id: string;
  collectionId: string;
  ownerAppUserId?: string;
  sourceBlockId?: string;
  sourcePageId?: string;
  data: Record<string, AppDataRecordValue | undefined>;
  createdAt: Date;
  updatedAt: Date;

  // Compatibility aliases retained for existing web, Android, and API consumers.
  appUserId?: string;
  sourceId: string;
  blockId: string;
  formBlockId: string;
  pageId: string;
  submittedAt: Date;
};

export type PublicSerializedAppDataRecord = Omit<
  SerializedAppDataRecord,
  'ownerAppUserId' | 'appUserId'
>;

export function findAppDataSource(project: ProjectLike, sourceId: string): AppDataSourceMatch | null {
  const collection = (project.dataCollections || []).find((entry) => entry.id === sourceId);
  if (collection) return createCollectionSource(collection);

  for (const page of project.pages || []) {
    const pageBlocks = page.blocks || [];
    const block = pageBlocks.find((entry) => entry.id === sourceId);
    if (!block) continue;

    if (isSubmitSourceBlock(block)) {
      return {
        id: block.id,
        sourceId: block.id,
        blockId: block.id,
        type: 'button',
        name: readStringProp(block, 'dataSourceName') || readStringProp(block, 'label') || 'App Data',
        pageId: page.id,
        pageTitle: page.title || 'Untitled Page',
        block,
        pageBlocks,
        fields: collectSelectedFields(pageBlocks, block),
        publicRead: false,
        access: LEGACY_SOURCE_ACCESS,
      };
    }

    if (block.type === 'form') {
      return {
        id: block.id,
        sourceId: block.id,
        blockId: block.id,
        type: 'form',
        name: readStringProp(block, 'title') || 'Form',
        pageId: page.id,
        pageTitle: page.title || 'Untitled Page',
        block,
        pageBlocks,
        fields: collectFormChildFields(project, block.id),
        publicRead: false,
        access: LEGACY_SOURCE_ACCESS,
      };
    }

    if (block.type === 'contactForm') {
      return {
        id: block.id,
        sourceId: block.id,
        blockId: block.id,
        type: 'contactForm',
        name: readStringProp(block, 'title') || 'Contact Form',
        pageId: page.id,
        pageTitle: page.title || 'Untitled Page',
        block,
        pageBlocks,
        fields: collectContactFormFields(block),
        publicRead: false,
        access: LEGACY_SOURCE_ACCESS,
      };
    }
  }

  return null;
}

export function collectAppDataSourceMatches(project: ProjectLike): AppDataSourceMatch[] {
  const sources: AppDataSourceMatch[] = (project.dataCollections || []).map(createCollectionSource);

  for (const page of project.pages || []) {
    for (const block of page.blocks || []) {
      if (!isSubmitSourceBlock(block) && block.type !== 'form' && block.type !== 'contactForm') continue;
      if (isSubmitSourceBlock(block) && resolveSubmitCollectionId(block)) continue;
      const source = findAppDataSource(project, block.id);
      if (source) sources.push(source);
    }
  }

  return sources;
}

export async function listAppDataSources(project: ProjectLike, ownerId: string, projectId: string): Promise<AppDataSourceSummary[]> {
  const sources = collectAppDataSourceMatches(project);

  return Promise.all(
    sources.map(async (source) => ({
      id: source.id,
      sourceId: source.sourceId,
      blockId: source.blockId,
      type: source.type,
      name: source.name,
      pageId: source.pageId,
      pageTitle: source.pageTitle,
      fields: source.fields,
      access: source.access,
      recordCount: await AppDataRecordModel.countDocuments({
        ownerId,
        projectId,
        ...appDataRecordSourceFilter(source.sourceId),
      }),
    })),
  );
}

export async function createAppDataRecord(
  project: ProjectLike,
  sourceId: string,
  body: unknown,
  options: { ownerAppUserId?: string; bypassAccess?: boolean } = {},
) {
  const requestedSource = findAppDataSource(project, sourceId);
  if (!requestedSource) {
    const error: any = new Error('App data source not found');
    error.status = 404;
    throw error;
  }

  const collectionId = requestedSource.block && isSubmitSourceBlock(requestedSource.block)
    ? resolveSubmitCollectionId(requestedSource.block)
    : '';
  const source = resolveAppDataWriteSource(project, sourceId);
  if (!source || (collectionId && source.type !== 'collection')) {
    const error: any = new Error('Target collection not found');
    error.status = 404;
    throw error;
  }
  if (!options.bypassAccess) {
    assertCanCreateAppDataRecord(source, options.ownerAppUserId);
  }

  if (!source.fields.length) {
    const error: any = new Error('App data source has no fields');
    error.status = 400;
    throw error;
  }

  const data = sanitizeRecordData(source.fields, body);
  assertHasValue(data);

  const ownerId = project.ownerId;
  if (!ownerId) {
    const error: any = new Error('Project owner missing');
    error.status = 500;
    throw error;
  }

  const record = await AppDataRecordModel.create({
    ownerId,
    projectId: String(project.id || project._id),
    collectionId: source.sourceId,
    ...(options.ownerAppUserId ? { ownerAppUserId: options.ownerAppUserId } : {}),
    ...(requestedSource.block?.id ? { sourceBlockId: requestedSource.block.id } : {}),
    sourcePageId: requestedSource.pageId || source.pageId || 'collection',
    data,
  });

  return serializeAppDataRecord(record);
}

export function resolveAppDataWriteSource(project: ProjectLike, sourceId: string): AppDataSourceMatch | null {
  const requestedSource = findAppDataSource(project, sourceId);
  if (!requestedSource) return null;
  if (!requestedSource.block || !isSubmitSourceBlock(requestedSource.block)) return requestedSource;
  const collectionId = resolveSubmitCollectionId(requestedSource.block);
  return collectionId ? findAppDataSource(project, collectionId) : requestedSource;
}

export function isPublicReadableCollection(project: ProjectLike, collectionId: string) {
  const source = findAppDataSource(project, collectionId);
  return source?.type === 'collection' && source.access.read === 'public';
}

export function isPublicSubmissionSource(project: ProjectLike, sourceId: string) {
  const source = findAppDataSource(project, sourceId);
  return Boolean(source && source.type !== 'collection');
}

function assertCanCreateAppDataRecord(source: AppDataSourceMatch, appUserId?: string) {
  if (source.access.create === 'authenticated' && !appUserId) {
    throw createServiceError('Sign in before creating records in this collection', 401);
  }
}

export async function listAppDataRecords(
  project: ProjectLike,
  ownerId: string,
  projectId: string,
  sourceId: string,
  options: { limit?: number } = {},
) {
  const source = resolveAppDataWriteSource(project, sourceId);
  if (!source) {
    const error: any = new Error('App data source not found');
    error.status = 404;
    throw error;
  }
  let query = AppDataRecordModel.find({
    ownerId,
    projectId,
    ...appDataRecordSourceFilter(source.sourceId),
  }).sort({ createdAt: -1, submittedAt: -1 });
  if (options.limit) query = query.limit(Math.max(1, options.limit));
  const records = await query.lean();

  return records.map((record) => serializeAppDataRecord(record));
}

export async function getLatestAppDataRecord(
  project: ProjectLike,
  ownerId: string,
  projectId: string,
  sourceId: string,
) {
  const records = await listAppDataRecords(project, ownerId, projectId, sourceId, { limit: 1 });
  return records[0] ?? null;
}

export async function listCurrentAppUserRecords(
  project: ProjectLike,
  ownerId: string,
  projectId: string,
  collectionId: string,
  appUserId: string,
) {
  const source = requireCollectionSource(project, collectionId);
  if (source.access.read !== 'own' && source.access.read !== 'public') {
    throw createServiceError('This collection does not allow app-user reads', 403);
  }

  const records = await AppDataRecordModel.find({
    ownerId,
    projectId,
    ...appDataRecordScopeFilter(source.sourceId, appUserId),
  }).sort({ createdAt: -1, submittedAt: -1 }).lean();

  return records.map((record) => serializeAppDataRecord(record));
}

export async function getAppDataRecord(
  project: ProjectLike,
  ownerId: string,
  projectId: string,
  sourceId: string,
  recordId: string,
) {
  const source = resolveAppDataWriteSource(project, sourceId);
  if (!source) {
    const error: any = new Error('App data source not found');
    error.status = 404;
    throw error;
  }
  if (!isValidObjectId(recordId)) return null;

  const record = await AppDataRecordModel.findOne({
    _id: recordId,
    ownerId,
    projectId,
    ...appDataRecordSourceFilter(source.sourceId),
  }).lean();
  return record ? serializeAppDataRecord(record) : null;
}

export async function updateAppDataRecord(
  project: ProjectLike,
  ownerId: string,
  projectId: string,
  sourceId: string,
  recordId: string,
  body: unknown,
  options: { ownerAppUserId?: string } = {},
) {
  const source = resolveAppDataWriteSource(project, sourceId);
  if (!source) {
    throw createServiceError('App data source not found', 404);
  }
  if (!isValidObjectId(recordId)) return null;
  if (!isRecord(body)) {
    throw createServiceError('Record data must be an object', 400);
  }

  const recordFilter = {
    _id: recordId,
    ownerId,
    projectId,
    ...appDataRecordScopeFilter(source.sourceId, options.ownerAppUserId),
  };
  const existing = await AppDataRecordModel.findOne(recordFilter).lean();
  if (!existing) return null;

  const data = sanitizeRecordData(source.fields, {
    ...(isRecord(existing.data) ? existing.data : {}),
    ...body,
  });
  assertHasValue(data);

  const createdAt = resolveRecordDate(existing.createdAt, existing.submittedAt, existing._id);
  const ownerAppUserId = readNonEmptyString(existing.ownerAppUserId)
    || readNonEmptyString(existing.appUserId);
  const sourceBlockId = readNonEmptyString(existing.sourceBlockId);
  const sourcePageId = readNonEmptyString(existing.sourcePageId)
    || readNonEmptyString(existing.pageId)
    || source.pageId
    || 'collection';

  const updated = await AppDataRecordModel.findOneAndUpdate(
    recordFilter,
    {
      $set: {
        collectionId: source.sourceId,
        ...(ownerAppUserId ? { ownerAppUserId } : {}),
        ...(sourceBlockId ? { sourceBlockId } : {}),
        sourcePageId,
        data,
        createdAt,
        updatedAt: new Date(),
      },
    },
    { new: true },
  ).lean();

  return updated ? serializeAppDataRecord(updated) : null;
}

export async function deleteAppDataRecord(
  project: ProjectLike,
  ownerId: string,
  projectId: string,
  sourceId: string,
  recordId: string,
  options: { ownerAppUserId?: string } = {},
) {
  const source = resolveAppDataWriteSource(project, sourceId);
  if (!source) {
    throw createServiceError('App data source not found', 404);
  }
  if (!isValidObjectId(recordId)) return false;

  const deleted = await AppDataRecordModel.findOneAndDelete({
    _id: recordId,
    ownerId,
    projectId,
    ...appDataRecordScopeFilter(source.sourceId, options.ownerAppUserId),
  }).lean();
  return Boolean(deleted);
}

export async function updateCurrentAppUserRecord(
  project: ProjectLike,
  ownerId: string,
  projectId: string,
  collectionId: string,
  recordId: string,
  appUserId: string,
  body: unknown,
) {
  const source = requireCollectionSource(project, collectionId);
  if (source.access.update !== 'own') {
    throw createServiceError('This collection does not allow app-user updates', 403);
  }
  return updateAppDataRecord(project, ownerId, projectId, collectionId, recordId, body, {
    ownerAppUserId: appUserId,
  });
}

export async function deleteCurrentAppUserRecord(
  project: ProjectLike,
  ownerId: string,
  projectId: string,
  collectionId: string,
  recordId: string,
  appUserId: string,
) {
  const source = requireCollectionSource(project, collectionId);
  if (source.access.delete !== 'own') {
    throw createServiceError('This collection does not allow app-user deletes', 403);
  }
  return deleteAppDataRecord(project, ownerId, projectId, collectionId, recordId, {
    ownerAppUserId: appUserId,
  });
}

export function appDataRecordsToCsv(source: AppDataSourceSummary | AppDataSourceMatch, records: SerializedAppDataRecord[]) {
  const fieldKeys = new Set(source.fields.map((field) => field.key));
  for (const record of records) {
    for (const key of Object.keys(record.data || {})) fieldKeys.add(key);
  }

  const orderedKeys = [
    ...source.fields.map((field) => field.key),
    ...Array.from(fieldKeys).filter((key) => !source.fields.some((field) => field.key === key)).sort(),
  ];
  const labelsByKey = new Map(source.fields.map((field) => [field.key, field.label]));
  const header = ['Submitted At', ...orderedKeys.map((key) => labelsByKey.get(key) || formatLabel(key))];
  const rows = records.map((record) => [
    new Date(record.submittedAt).toISOString(),
    ...orderedKeys.map((key) => formatCsvValue(record.data?.[key])),
  ]);

  return [header, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

export function getAppDataCsvFileName(project: ProjectLike, source: AppDataSourceSummary | AppDataSourceMatch) {
  const projectPart = slugify(project.name || 'project');
  const sourcePart = slugify(source.name || 'app-data');
  return `${projectPart}-${sourcePart}-records.csv`;
}

export function collectDynamicFormFields(project: ProjectLike, sourceId: string): AppDataFieldDefinition[] {
  return findAppDataSource(project, sourceId)?.fields || [];
}

function collectFormChildFields(project: ProjectLike, formBlockId: string): AppDataFieldDefinition[] {
  const fields: AppDataFieldDefinition[] = [];
  const usedKeys = new Map<string, number>();

  for (const page of project.pages || []) {
    for (const block of page.blocks || []) {
      if (block.parentId !== formBlockId || !isSubmissionFieldBlock(block)) continue;
      fields.push(createFieldDefinition(block, usedKeys));
    }
  }

  return fields;
}

function collectSelectedFields(pageBlocks: BlockLike[], submitBlock: BlockLike): AppDataFieldDefinition[] {
  const fields: AppDataFieldDefinition[] = [];
  const usedKeys = new Map<string, number>();
  const fieldsById = new Map(pageBlocks.map((block) => [block.id, block]));

  for (const fieldRef of readSubmitActionFields(submitBlock)) {
    const block = fieldsById.get(fieldRef.fieldBlockId);
    if (!block || !isSubmissionFieldBlock(block)) continue;
    fields.push(createFieldDefinition(block, usedKeys, fieldRef.targetFieldKey));
  }

  return fields;
}

function collectContactFormFields(block: BlockLike): AppDataFieldDefinition[] {
  const fields: AppDataFieldDefinition[] = [];
  if (block.props?.showName !== false) fields.push({ blockId: block.id, type: 'text', key: 'name', label: 'Name', required: false });
  if (block.props?.showEmail !== false) fields.push({ blockId: block.id, type: 'email', key: 'email', label: 'Email', required: false });
  if (block.props?.showPhone) fields.push({ blockId: block.id, type: 'phone', key: 'phone', label: 'Phone', required: false });
  if (block.props?.showMessage !== false) fields.push({ blockId: block.id, type: 'text', key: 'message', label: 'Message', required: false });
  return fields;
}

function createCollectionSource(collection: CollectionLike): AppDataSourceMatch {
  const access = resolveAppDataCollectionAccess(collection);
  return {
    id: collection.id,
    sourceId: collection.id,
    blockId: collection.id,
    type: 'collection',
    name: collection.name?.trim() || 'Collection',
    pageId: '',
    pageTitle: 'Project data',
    pageBlocks: [],
    fields: (collection.fields || [])
      .filter((field) => typeof field.key === 'string' && field.key.trim())
      .map((field, index) => ({
        blockId: field.id?.trim() || `${collection.id}-field-${index + 1}`,
        type: normalizeCollectionFieldType(field.type),
        key: field.key!.trim(),
        label: field.label?.trim() || formatLabel(field.key!.trim()),
        required: Boolean(field.required),
      })),
    publicRead: access.read === 'public',
    access,
  };
}

export function resolveAppDataCollectionAccess(
  collection: Pick<CollectionLike, 'publicRead' | 'access'>,
): AppDataCollectionAccess {
  return {
    create: collection.access?.create === 'authenticated' ? 'authenticated' : 'anyone',
    read: collection.access?.read === 'public'
      || collection.access?.read === 'own'
      || collection.access?.read === 'none'
      ? collection.access.read
      : collection.publicRead ? 'public' : 'none',
    update: collection.access?.update === 'own' ? 'own' : 'none',
    delete: collection.access?.delete === 'own' ? 'own' : 'none',
  };
}

function createFieldDefinition(block: BlockLike, usedKeys: Map<string, number>, targetFieldKey?: string): AppDataFieldDefinition {
  const baseKey = targetFieldKey?.trim() || resolveFieldKey(block);
  const count = usedKeys.get(baseKey) ?? 0;
  usedKeys.set(baseKey, count + 1);
  const key = count === 0 ? baseKey : `${baseKey}_${count + 1}`;

  return {
    blockId: block.id,
    type: resolveFieldDefinitionType(block),
    key,
    label: readableLabel(block),
    required: Boolean(block.props?.required),
  };
}

export function sanitizeRecordData(fields: AppDataFieldDefinition[], body: unknown): Record<string, AppDataRecordValue> {
  const source = isRecord(body) ? body : {};
  const data: Record<string, AppDataRecordValue> = {};

  for (const field of fields) {
    const hasFieldValue = Object.prototype.hasOwnProperty.call(source, field.key);
    const hasBlockValue = Object.prototype.hasOwnProperty.call(source, field.blockId);
    const hasSubmittedValue = hasFieldValue || hasBlockValue;
    const raw = hasFieldValue ? source[field.key] : source[field.blockId];

    if (field.type === 'checkbox' || field.type === 'toggle' || field.type === 'boolean') {
      if (!hasSubmittedValue) {
        if (field.required) {
          const error: any = new Error(`${field.label} is required`);
          error.status = 400;
          throw error;
        }
        continue;
      }

      const value = coerceBoolean(raw);
      if (field.required && value !== true) {
        const error: any = new Error(`${field.label} is required`);
        error.status = 400;
        throw error;
      }
      data[field.key] = value;
      continue;
    }

    const value = typeof raw === 'string' ? raw.trim() : '';
    if (field.required && !value) {
      const error: any = new Error(`${field.label} is required`);
      error.status = 400;
      throw error;
    }
    if (!value) continue;
    data[field.key] = value;
  }

  return data;
}

function assertHasValue(data: Record<string, AppDataRecordValue | undefined>) {
  const hasValue = Object.values(data).some((value) => {
    if (typeof value === 'boolean') return value;
    return typeof value === 'string' && value.trim().length > 0;
  });

  if (!hasValue) {
    const error: any = new Error('At least one field is required');
    error.status = 400;
    throw error;
  }
}

type StoredAppDataRecordLike = {
  id?: unknown;
  _id?: unknown;
  collectionId?: unknown;
  ownerAppUserId?: unknown;
  sourceBlockId?: unknown;
  sourcePageId?: unknown;
  data?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  appUserId?: unknown;
  formBlockId?: unknown;
  pageId?: unknown;
  submittedAt?: unknown;
};

export function serializeAppDataRecord(record: StoredAppDataRecordLike): SerializedAppDataRecord {
  const id = String(record.id || record._id);
  const collectionId = readNonEmptyString(record.collectionId)
    || readNonEmptyString(record.formBlockId);
  if (!collectionId) {
    throw createServiceError('Stored app-data record has no collection identifier', 500);
  }

  const ownerAppUserId = readNonEmptyString(record.ownerAppUserId)
    || readNonEmptyString(record.appUserId);
  const sourceBlockId = readNonEmptyString(record.sourceBlockId);
  const sourcePageId = readNonEmptyString(record.sourcePageId)
    || readNonEmptyString(record.pageId)
    || 'collection';
  const createdAt = resolveRecordDate(record.createdAt, record.submittedAt, record._id);
  const updatedAt = resolveRecordDate(record.updatedAt, createdAt, record._id);

  return {
    id,
    collectionId,
    ...(ownerAppUserId ? { ownerAppUserId, appUserId: ownerAppUserId } : {}),
    ...(sourceBlockId ? { sourceBlockId } : {}),
    sourcePageId,
    data: isRecord(record.data)
      ? record.data as Record<string, AppDataRecordValue | undefined>
      : {},
    createdAt,
    updatedAt,
    sourceId: collectionId,
    blockId: collectionId,
    formBlockId: collectionId,
    pageId: sourcePageId,
    submittedAt: createdAt,
  };
}

export function serializePublicAppDataRecord(
  record: SerializedAppDataRecord,
): PublicSerializedAppDataRecord {
  const {
    ownerAppUserId: _ownerAppUserId,
    appUserId: _appUserId,
    ...publicRecord
  } = record;
  return publicRecord;
}

export function appDataRecordSourceFilter(collectionId: string): FilterQuery<AppDataRecord> {
  return {
    $or: [
      { collectionId },
      { collectionId: { $exists: false }, formBlockId: collectionId },
    ],
  };
}

export function appDataRecordOwnerFilter(appUserId: string): FilterQuery<AppDataRecord> {
  return {
    $or: [
      { ownerAppUserId: appUserId },
      { ownerAppUserId: { $exists: false }, appUserId },
    ],
  };
}

function appDataRecordScopeFilter(
  collectionId: string,
  appUserId?: string,
): FilterQuery<AppDataRecord> {
  const sourceFilter = appDataRecordSourceFilter(collectionId);
  return appUserId
    ? { $and: [sourceFilter, appDataRecordOwnerFilter(appUserId)] }
    : sourceFilter;
}

function requireCollectionSource(project: ProjectLike, collectionId: string) {
  const source = findAppDataSource(project, collectionId);
  if (!source || source.type !== 'collection') {
    throw createServiceError('App data collection not found', 404);
  }
  return source;
}

function resolveFieldKey(block: BlockLike) {
  const explicit = typeof block.props?.fieldKey === 'string' ? block.props.fieldKey : '';
  const label = readableLabel(block);
  const raw = explicit.trim() || label || block.id;
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || block.id;
}

function readableLabel(block: BlockLike) {
  const fieldLabel = typeof block.props?.fieldLabel === 'string' ? block.props.fieldLabel.trim() : '';
  const label = typeof block.props?.label === 'string' ? block.props.label.trim() : '';
  const placeholder = typeof block.props?.placeholder === 'string' ? block.props.placeholder.trim() : '';
  return fieldLabel || label || placeholder || block.id;
}

function isSubmissionFieldBlock(block: BlockLike) {
  return block.type === 'checkbox'
    || block.type === 'toggle'
    || (block.type === 'text' && block.props?.editable === true);
}

function resolveFieldDefinitionType(block: BlockLike): AppDataFieldDefinition['type'] {
  if (block.type === 'checkbox' || block.type === 'toggle') return block.type;
  const inputType = readStringProp(block, 'inputType');
  if (inputType === 'number' || inputType === 'email' || inputType === 'phone' || inputType === 'date') {
    return inputType;
  }
  return 'text';
}

function coerceBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true' || value === 'on' || value === '1';
  if (typeof value === 'number') return value === 1;
  return false;
}

function readStringProp(block: BlockLike, key: string) {
  const value = block.props?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function readSubmitActionFields(block: BlockLike) {
  const action = block.props?.action;
  if (!isRecord(action) || action.type !== 'submitData' || !Array.isArray(action.fields)) return [];
  const fields = new Map<string, { fieldBlockId: string; targetFieldKey?: string }>();

  for (const candidate of action.fields) {
    if (!isRecord(candidate) || typeof candidate.fieldBlockId !== 'string') continue;
    const fieldBlockId = candidate.fieldBlockId.trim();
    if (!fieldBlockId || fields.has(fieldBlockId)) continue;
    const targetFieldKey = typeof candidate.targetFieldKey === 'string' ? candidate.targetFieldKey.trim() : '';
    fields.set(fieldBlockId, { fieldBlockId, ...(targetFieldKey ? { targetFieldKey } : {}) });
  }

  return Array.from(fields.values());
}

function resolveSubmitCollectionId(block: BlockLike) {
  const action = block.props?.action;
  if (isRecord(action) && action.type === 'submitData' && typeof action.collectionId === 'string') {
    return action.collectionId.trim();
  }
  return readStringProp(block, 'collectionId');
}

function isSubmitSourceBlock(block: BlockLike) {
  if (block.type !== 'button') return false;
  const action = block.props?.action;
  return isRecord(action) && action.type === 'submitData';
}

function normalizeCollectionFieldType(value: unknown): AppDataFieldDefinition['type'] {
  if (value === 'number' || value === 'boolean' || value === 'email' || value === 'date') return value;
  return 'text';
}

function formatCsvValue(value: AppDataRecordValue | undefined) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return value || '';
}

function escapeCsvCell(value: string) {
  if (!/[",\r\n]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

function formatLabel(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'app-data';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function readNonEmptyString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function resolveRecordDate(primary: unknown, fallback: unknown, objectId: unknown) {
  const primaryDate = toValidDate(primary);
  if (primaryDate) return primaryDate;
  const fallbackDate = toValidDate(fallback);
  if (fallbackDate) return fallbackDate;
  if (objectId && typeof objectId === 'object' && 'getTimestamp' in objectId) {
    const getTimestamp = objectId.getTimestamp;
    if (typeof getTimestamp === 'function') {
      const objectIdDate = toValidDate(getTimestamp.call(objectId));
      if (objectIdDate) return objectIdDate;
    }
  }
  return new Date(0);
}

function toValidDate(value: unknown) {
  const date = value instanceof Date
    ? value
    : typeof value === 'string' || typeof value === 'number'
      ? new Date(value)
      : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function createServiceError(message: string, status: number) {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
}
