export const APP_GENERATION_PLAN_VERSION = 1

export const AI_GENERATION_SUPPORTED_SCOPES = ['page'] as const

export const AI_GENERATION_SUPPORTED_BLOCK_TYPES = [
  'hero',
  'text',
  'button',
  'repeater',
] as const

export const AI_GENERATION_SUPPORTED_ACTION_TYPES = [
  'navigate',
  'submitData',
] as const

export const AI_GENERATION_SUPPORTED_BINDING_RECORDS = [
  'latest',
  'currentItem',
] as const

export const AI_GENERATION_COLLECTION_ACCESS_PRESETS = [
  'public-directory',
  'authenticated-own-records',
  'private-submissions',
] as const

export const AI_GENERATION_LIMITS = {
  collections: 5,
  fieldsPerCollection: 30,
  pages: 5,
  blocksPerPage: 60,
  keyLength: 80,
  summaryLength: 240,
  pageTitleLength: 80,
  pagePathLength: 120,
  blockTextLength: 600,
} as const

export const AI_GENERATION_CAPABILITIES = {
  catalogVersion: 1,
  planVersion: APP_GENERATION_PLAN_VERSION,
  scopes: AI_GENERATION_SUPPORTED_SCOPES,
  blockTypes: AI_GENERATION_SUPPORTED_BLOCK_TYPES,
  actionTypes: AI_GENERATION_SUPPORTED_ACTION_TYPES,
  bindingRecords: AI_GENERATION_SUPPORTED_BINDING_RECORDS,
  collectionAccessPresets: AI_GENERATION_COLLECTION_ACCESS_PRESETS,
  limits: AI_GENERATION_LIMITS,
} as const
