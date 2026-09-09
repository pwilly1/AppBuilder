import type { AI_GENERATION_FONT_FAMILIES } from './aiCapabilities.js'
import {
  AI_GENERATION_COLLECTION_ACCESS_PRESETS,
  AI_GENERATION_CORNER_STYLES,
  AI_GENERATION_DENSITIES,
  AI_GENERATION_SECTION_PATTERNS,
  AI_GENERATION_SUPPORTED_BLOCK_TYPES,
  AI_GENERATION_SUPPORTED_SCOPES,
  AI_GENERATION_VISUAL_ROLES,
} from './aiCapabilities.js'

export type AppDataFieldType = 'text' | 'number' | 'boolean' | 'email' | 'date'
export type PageAccessMode = 'public' | 'signedIn' | 'signedOut'
export type RenderAlign = 'start' | 'center' | 'end'

export type GridPlacement = {
  colStart: number
  rowStart: number
  colSpan: number
  rowSpan: number
}

export type AiGenerationBlockType = typeof AI_GENERATION_SUPPORTED_BLOCK_TYPES[number]
export type AiGenerationScope = typeof AI_GENERATION_SUPPORTED_SCOPES[number]
export type AiCollectionAccessPreset = typeof AI_GENERATION_COLLECTION_ACCESS_PRESETS[number]
export type AiGenerationVisualRole = typeof AI_GENERATION_VISUAL_ROLES[number]
export type AiGenerationSectionPattern = typeof AI_GENERATION_SECTION_PATTERNS[number]
export type AiGenerationCornerStyle = typeof AI_GENERATION_CORNER_STYLES[number]
export type AiGenerationDensity = typeof AI_GENERATION_DENSITIES[number]

export type AiGenerationPlanIssue = {
  code: string
  path: string
  message: string
  details?: AiGenerationIssueDetails
}

export type GridSpan = {
  cols: number
  rows: number
}

export type AiGenerationIssueDetails = {
  pageKey?: string
  blockKey?: string
  proposedGrid?: GridPlacement
  normalizedGrid?: GridPlacement
  requiredSpan?: GridSpan
  availableSpan?: GridSpan
  siblingBlockKeys?: string[]
}

export type AiGenerationPlanParseResult =
  | { success: true; data: AppGenerationPlanV1 }
  | { success: false; issues: AiGenerationPlanIssue[] }

export type AiCollectionFieldPlan = {
  key: string
  label: string
  type: AppDataFieldType
  required?: boolean
}

export type AiCollectionPlan = {
  key: string
  name: string
  accessPreset: AiCollectionAccessPreset
  fields: AiCollectionFieldPlan[]
}

export type AiPageAccessPlan = {
  mode: PageAccessMode
  redirectPageKey?: string
}

export type AiBlockRenderPlan = {
  alignX?: RenderAlign
  alignY?: RenderAlign
}

export type AiCollectionBindingPlan = {
  collectionKey: string
  fieldKey: string
  record: 'latest' | 'currentItem'
  fallback?: string
}

export type AiNavigateActionPlan = {
  type: 'navigate'
  targetPageKey: string
}

export type AiSubmitFieldPlan = {
  fieldBlockKey: string
  targetFieldKey: string
}

export type AiSubmitDataActionPlan = {
  type: 'submitData'
  collectionKey: string
  fields: AiSubmitFieldPlan[]
}

export type AiButtonActionPlan = AiNavigateActionPlan | AiSubmitDataActionPlan

type AiBlockPlanBase = {
  key: string
  parentKey?: string
  visualRole?: AiGenerationVisualRole
  grid: GridPlacement
  render?: AiBlockRenderPlan
}

export type AiHeroBlockPlan = AiBlockPlanBase & {
  type: 'hero'
  content: {
    headline: string
    fontFamily?: typeof AI_GENERATION_FONT_FAMILIES[number]
    headlineSize?: number
    contentPadding?: number
  }
  headlineBinding?: AiCollectionBindingPlan
}

export type AiTextBlockPlan = AiBlockPlanBase & {
  type: 'text'
  content: {
    value?: string
    fontFamily?: typeof AI_GENERATION_FONT_FAMILIES[number]
    fontSize?: number
    contentPadding?: number
    textColor?: string
    editable?: boolean
    textInputMode?: 'singleLine' | 'multiline'
    inputType?: 'text' | 'email' | 'password' | 'number'
    fieldLabel?: string
    showFieldLabel?: boolean
    fieldKey?: string
    required?: boolean
    placeholder?: string
    backgroundColor?: string
    placeholderColor?: string
    borderColor?: string
    borderWidth?: number
    borderRadius?: number
  }
  valueBinding?: AiCollectionBindingPlan
}

export type AiButtonBlockPlan = AiBlockPlanBase & {
  type: 'button'
  content: {
    label: string
    dataSourceName?: string
    successMessage?: string
    fontFamily?: typeof AI_GENERATION_FONT_FAMILIES[number]
    fontSize?: number
    buttonPaddingX?: number
    buttonPaddingY?: number
    backgroundColor?: string
    textColor?: string
    borderRadius?: number
  }
  action?: AiButtonActionPlan
}

export type AiRepeaterBlockPlan = AiBlockPlanBase & {
  type: 'repeater'
  collectionKey: string
  content?: {
    scope?: 'all' | 'currentUser'
    order?: 'newest' | 'oldest'
    limit?: number
    itemRowSpan?: number
    gapRows?: number
    emptyText?: string
    backgroundColor?: string
    borderColor?: string
    borderWidth?: number
    borderRadius?: number
    opacity?: number
  }
}

export type AiBlockPlan =
  | AiHeroBlockPlan
  | AiTextBlockPlan
  | AiButtonBlockPlan
  | AiRepeaterBlockPlan

export type AiPageVisualStyle = {
  pageBackground: string
  surfaceColor: string
  primaryColor: string
  primaryTextColor: string
  textColor: string
  mutedTextColor: string
  borderColor: string
  cornerStyle: AiGenerationCornerStyle
  density: AiGenerationDensity
}

export type AiPageSectionPlan = {
  key: string
  pattern: AiGenerationSectionPattern
  blockKeys: string[]
}

export type AiPagePlan = {
  key: string
  title: string
  path?: string
  backgroundColor?: string
  access?: AiPageAccessPlan
  visualStyle?: AiPageVisualStyle
  sections?: AiPageSectionPlan[]
  blocks: AiBlockPlan[]
}

export type AppGenerationPlanV1 = {
  planVersion: 1
  scope: AiGenerationScope
  summary: string
  collections: AiCollectionPlan[]
  pages: AiPagePlan[]
}
