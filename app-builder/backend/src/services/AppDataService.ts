import { AppSubmissionModel, type AppSubmissionValue } from '../models/AppSubmission.js';

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
  fields?: Array<{
    id?: string;
    key?: string;
    label?: string;
    type?: string;
    required?: boolean;
  }>;
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
};

export type AppDataFieldDefinition = {
  blockId: string;
  type: 'input' | 'textarea' | 'checkbox' | 'toggle' | 'text' | 'number' | 'email' | 'phone' | 'date' | 'boolean';
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
};

export type SerializedAppDataRecord = {
  id: string;
  sourceId: string;
  blockId: string;
  formBlockId: string;
  pageId: string;
  data: Record<string, AppSubmissionValue | undefined>;
  submittedAt: Date;
};

const FIELD_TYPES = new Set(['input', 'textarea', 'checkbox', 'toggle']);

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
        fields: collectGroupedFields(pageBlocks, block),
        publicRead: false,
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
      recordCount: await AppSubmissionModel.countDocuments({ ownerId, projectId, formBlockId: source.sourceId }),
    })),
  );
}

export async function createAppDataRecord(project: ProjectLike, sourceId: string, body: unknown) {
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

  const submission = await AppSubmissionModel.create({
    ownerId,
    projectId: String(project.id || project._id),
    formBlockId: source.sourceId,
    pageId: requestedSource.pageId || source.pageId || 'collection',
    data,
  });

  return serializeAppDataRecord(submission);
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
  return source?.type === 'collection' && source.publicRead;
}

export function isPublicSubmissionSource(project: ProjectLike, sourceId: string) {
  const source = findAppDataSource(project, sourceId);
  return Boolean(source && source.type !== 'collection');
}

export async function listAppDataRecords(
  project: ProjectLike,
  ownerId: string,
  projectId: string,
  sourceId: string,
  options: { limit?: number } = {},
) {
  const source = findAppDataSource(project, sourceId);
  if (!source) {
    const error: any = new Error('App data source not found');
    error.status = 404;
    throw error;
  }

  let query = AppSubmissionModel.find({ ownerId, projectId, formBlockId: sourceId })
    .sort({ submittedAt: -1 });
  if (options.limit) query = query.limit(Math.max(1, options.limit));
  const submissions = await query.lean();

  return submissions.map((submission) => serializeAppDataRecord(submission));
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
      if (block.parentId !== formBlockId || !FIELD_TYPES.has(block.type)) continue;
      fields.push(createFieldDefinition(block, usedKeys));
    }
  }

  return fields;
}

function collectGroupedFields(pageBlocks: BlockLike[], submitBlock: BlockLike): AppDataFieldDefinition[] {
  const fields: AppDataFieldDefinition[] = [];
  const usedKeys = new Map<string, number>();
  const submitGroupId = resolveSubmitActionGroupId(submitBlock);

  for (const block of pageBlocks) {
    if (!FIELD_TYPES.has(block.type)) continue;
    if (resolveSubmitGroupId(readStringProp(block, 'submitGroupId')) !== submitGroupId) continue;
    fields.push(createFieldDefinition(block, usedKeys));
  }

  return fields;
}

function collectContactFormFields(block: BlockLike): AppDataFieldDefinition[] {
  const fields: AppDataFieldDefinition[] = [];
  if (block.props?.showName !== false) fields.push({ blockId: block.id, type: 'text', key: 'name', label: 'Name', required: false });
  if (block.props?.showEmail !== false) fields.push({ blockId: block.id, type: 'email', key: 'email', label: 'Email', required: false });
  if (block.props?.showPhone) fields.push({ blockId: block.id, type: 'phone', key: 'phone', label: 'Phone', required: false });
  if (block.props?.showMessage !== false) fields.push({ blockId: block.id, type: 'textarea', key: 'message', label: 'Message', required: false });
  return fields;
}

function createCollectionSource(collection: CollectionLike): AppDataSourceMatch {
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
    publicRead: Boolean(collection.publicRead),
  };
}

function createFieldDefinition(block: BlockLike, usedKeys: Map<string, number>): AppDataFieldDefinition {
  const baseKey = resolveFieldKey(block);
  const count = usedKeys.get(baseKey) ?? 0;
  usedKeys.set(baseKey, count + 1);
  const key = count === 0 ? baseKey : `${baseKey}_${count + 1}`;

  return {
    blockId: block.id,
    type: block.type as AppDataFieldDefinition['type'],
    key,
    label: readableLabel(block),
    required: Boolean(block.props?.required),
  };
}

function sanitizeRecordData(fields: AppDataFieldDefinition[], body: unknown): Record<string, AppSubmissionValue> {
  const source = isRecord(body) ? body : {};
  const data: Record<string, AppSubmissionValue> = {};

  for (const field of fields) {
    const raw = source[field.key] ?? source[field.blockId];

    if (field.type === 'checkbox' || field.type === 'toggle' || field.type === 'boolean') {
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
    data[field.key] = value;
  }

  return data;
}

function assertHasValue(data: Record<string, AppSubmissionValue | undefined>) {
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

function serializeAppDataRecord(submission: any): SerializedAppDataRecord {
  const id = String(submission.id || submission._id);
  return {
    id,
    sourceId: submission.formBlockId,
    blockId: submission.formBlockId,
    formBlockId: submission.formBlockId,
    pageId: submission.pageId,
    data: submission.data || {},
    submittedAt: submission.submittedAt,
  };
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
  const label = typeof block.props?.label === 'string' ? block.props.label.trim() : '';
  const placeholder = typeof block.props?.placeholder === 'string' ? block.props.placeholder.trim() : '';
  return label || placeholder || block.id;
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

function resolveSubmitGroupId(value?: string) {
  const raw = value?.trim() || 'default';
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || 'default';
}

function resolveSubmitActionGroupId(block: BlockLike) {
  const action = block.props?.action;
  if (isRecord(action) && action.type === 'submitData' && typeof action.submitGroupId === 'string') {
    return resolveSubmitGroupId(action.submitGroupId);
  }
  return resolveSubmitGroupId(readStringProp(block, 'submitGroupId'));
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

function formatCsvValue(value: AppSubmissionValue | undefined) {
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
