import type {
  AppDataFieldType,
  GridPlacement,
  PageAccessMode,
  RenderAlign,
} from '../shared/schema/types'

export const APP_GENERATION_PLAN_VERSION = 1

export const AI_GENERATION_SUPPORTED_BLOCK_TYPES = [
  'hero',
  'text',
  'button',
  'repeater',
] as const

export type AiGenerationBlockType = typeof AI_GENERATION_SUPPORTED_BLOCK_TYPES[number]
export type AiGenerationScope = 'page'
export type AiCollectionAccessPreset =
  | 'public-directory'
  | 'authenticated-own-records'
  | 'private-submissions'

export type AiGenerationPlanIssue = {
  code: string
  path: string
  message: string
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
  grid: GridPlacement
  render?: AiBlockRenderPlan
}

export type AiHeroBlockPlan = AiBlockPlanBase & {
  type: 'hero'
  content: {
    headline: string
    headlineSize?: number
    contentPadding?: number
  }
  headlineBinding?: AiCollectionBindingPlan
}

export type AiTextBlockPlan = AiBlockPlanBase & {
  type: 'text'
  content: {
    value?: string
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

export type AiPagePlan = {
  key: string
  title: string
  path?: string
  backgroundColor?: string
  access?: AiPageAccessPlan
  blocks: AiBlockPlan[]
}

export type AppGenerationPlanV1 = {
  planVersion: 1
  scope: AiGenerationScope
  summary: string
  collections: AiCollectionPlan[]
  pages: AiPagePlan[]
}
