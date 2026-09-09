export const AI_GENERATION_FONT_FAMILIES = ['default', 'lato', 'lusitana', 'spaceMono'] as const
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

export const AI_GENERATION_VISUAL_ROLES = [
  'heading',
  'body',
  'field',
  'primaryAction',
  'secondaryAction',
  'list',
] as const

export const AI_GENERATION_SECTION_PATTERNS = [
  'intro',
  'form',
  'list',
  'split',
  'actions',
] as const

export const AI_GENERATION_CORNER_STYLES = [
  'square',
  'soft',
  'rounded',
] as const

export const AI_GENERATION_DENSITIES = [
  'compact',
  'comfortable',
] as const

export const AI_GENERATION_LIMITS = {
  collections: 5,
  fieldsPerCollection: 30,
  pages: 5,
  blocksPerPage: 60,
  sectionsPerPage: 20,
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
  visualRoles: AI_GENERATION_VISUAL_ROLES,
  sectionPatterns: AI_GENERATION_SECTION_PATTERNS,
  cornerStyles: AI_GENERATION_CORNER_STYLES,
  densities: AI_GENERATION_DENSITIES,
  fontFamilies: AI_GENERATION_FONT_FAMILIES,
  limits: AI_GENERATION_LIMITS,
} as const
