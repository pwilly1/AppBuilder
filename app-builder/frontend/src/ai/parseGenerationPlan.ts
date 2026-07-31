import {
  APP_GENERATION_PLAN_VERSION,
  AI_GENERATION_SUPPORTED_BLOCK_TYPES,
  type AiBlockPlan,
  type AiBlockRenderPlan,
  type AiButtonActionPlan,
  type AiButtonBlockPlan,
  type AiCollectionBindingPlan,
  type AiCollectionFieldPlan,
  type AiCollectionPlan,
  type AiGenerationPlanIssue,
  type AiGenerationPlanParseResult,
  type AiHeroBlockPlan,
  type AiPageAccessPlan,
  type AiPagePlan,
  type AiRepeaterBlockPlan,
  type AiSubmitFieldPlan,
  type AiTextBlockPlan,
} from './aiTypes'
import type { GridPlacement } from '../shared/schema/types'

const KEY_PATTERN = /^[a-z][a-z0-9-]*$/
const FIELD_KEY_PATTERN = /^[a-z][a-z0-9_]*$/
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i
const SUPPORTED_BLOCK_TYPES = new Set<string>(AI_GENERATION_SUPPORTED_BLOCK_TYPES)

export function parseAppGenerationPlan(value: unknown): AiGenerationPlanParseResult {
  const issues: AiGenerationPlanIssue[] = []
  const root = readObject(
    value,
    '$',
    ['planVersion', 'scope', 'summary', 'collections', 'pages'],
    issues,
  )
  if (!root) return { success: false, issues }

  const planVersion = readInteger(root.planVersion, '$.planVersion', issues, 1, 1)
  if (planVersion !== APP_GENERATION_PLAN_VERSION) {
    issues.push({
      code: 'unsupported-plan-version',
      path: '$.planVersion',
      message: `Expected plan version ${APP_GENERATION_PLAN_VERSION}.`,
    })
  }

  const scope = readEnum(root.scope, '$.scope', ['page'] as const, issues)
  const summary = readRequiredString(root.summary, '$.summary', issues, 240)
  const collections = parseArray(
    root.collections,
    '$.collections',
    issues,
    parseCollection,
    { min: 0, max: 5 },
  )
  const pages = parseArray(root.pages, '$.pages', issues, parsePage, { min: 1, max: 5 })

  validateUniqueKeys(collections, '$.collections', issues)
  validateUniqueKeys(pages, '$.pages', issues)

  if (issues.length || !scope) return { success: false, issues }

  return {
    success: true,
    data: {
      planVersion: APP_GENERATION_PLAN_VERSION,
      scope,
      summary,
      collections,
      pages,
    },
  }
}

function parseCollection(value: unknown, path: string, issues: AiGenerationPlanIssue[]): AiCollectionPlan | null {
  const object = readObject(value, path, ['key', 'name', 'accessPreset', 'fields'], issues)
  if (!object) return null

  const key = readKey(object.key, `${path}.key`, issues)
  const name = readRequiredString(object.name, `${path}.name`, issues, 80)
  const accessPreset = readEnum(
    object.accessPreset,
    `${path}.accessPreset`,
    ['public-directory', 'authenticated-own-records', 'private-submissions'] as const,
    issues,
  )
  const fields = parseArray(object.fields, `${path}.fields`, issues, parseCollectionField, { min: 1, max: 30 })
  validateUniqueKeys(fields, `${path}.fields`, issues)

  if (!key || !accessPreset) return null
  return { key, name, accessPreset, fields }
}

function parseCollectionField(
  value: unknown,
  path: string,
  issues: AiGenerationPlanIssue[],
): AiCollectionFieldPlan | null {
  const object = readObject(value, path, ['key', 'label', 'type', 'required'], issues)
  if (!object) return null

  const key = readFieldKey(object.key, `${path}.key`, issues)
  const label = readRequiredString(object.label, `${path}.label`, issues, 80)
  const type = readEnum(
    object.type,
    `${path}.type`,
    ['text', 'number', 'boolean', 'email', 'date'] as const,
    issues,
  )
  const required = readOptionalBoolean(object.required, `${path}.required`, issues)

  if (!key || !type) return null
  return { key, label, type, ...(required === undefined ? {} : { required }) }
}

function parsePage(value: unknown, path: string, issues: AiGenerationPlanIssue[]): AiPagePlan | null {
  const object = readObject(
    value,
    path,
    ['key', 'title', 'path', 'backgroundColor', 'access', 'blocks'],
    issues,
  )
  if (!object) return null

  const key = readKey(object.key, `${path}.key`, issues)
  const title = readRequiredString(object.title, `${path}.title`, issues, 80)
  const requestedPath = readOptionalString(object.path, `${path}.path`, issues, 120)
  const backgroundColor = readOptionalColor(object.backgroundColor, `${path}.backgroundColor`, issues)
  const access = object.access === undefined
    ? undefined
    : parsePageAccess(object.access, `${path}.access`, issues)
  const blocks = parseArray(object.blocks, `${path}.blocks`, issues, parseBlock, { min: 1, max: 60 })
  validateUniqueKeys(blocks, `${path}.blocks`, issues)

  if (!key) return null
  return {
    key,
    title,
    ...(requestedPath === undefined ? {} : { path: requestedPath }),
    ...(backgroundColor === undefined ? {} : { backgroundColor }),
    ...(access ? { access } : {}),
    blocks,
  }
}

function parsePageAccess(
  value: unknown,
  path: string,
  issues: AiGenerationPlanIssue[],
): AiPageAccessPlan | null {
  const object = readObject(value, path, ['mode', 'redirectPageKey'], issues)
  if (!object) return null

  const mode = readEnum(object.mode, `${path}.mode`, ['public', 'signedIn', 'signedOut'] as const, issues)
  const redirectPageKey = object.redirectPageKey === undefined
    ? undefined
    : readKey(object.redirectPageKey, `${path}.redirectPageKey`, issues)

  if (!mode) return null
  return { mode, ...(redirectPageKey ? { redirectPageKey } : {}) }
}

function parseBlock(value: unknown, path: string, issues: AiGenerationPlanIssue[]): AiBlockPlan | null {
  const baseObject = readObject(
    value,
    path,
    [
      'key',
      'parentKey',
      'type',
      'grid',
      'render',
      'content',
      'collectionKey',
      'headlineBinding',
      'valueBinding',
      'action',
    ],
    issues,
  )
  if (!baseObject) return null

  const key = readKey(baseObject.key, `${path}.key`, issues)
  const parentKey = baseObject.parentKey === undefined
    ? undefined
    : readKey(baseObject.parentKey, `${path}.parentKey`, issues)
  const type = readRequiredString(baseObject.type, `${path}.type`, issues, 40)
  const grid = parseGridPlacement(baseObject.grid, `${path}.grid`, issues)
  const render = baseObject.render === undefined
    ? undefined
    : parseRender(baseObject.render, `${path}.render`, issues)

  if (type && !SUPPORTED_BLOCK_TYPES.has(type)) {
    issues.push({
      code: 'unsupported-block-type',
      path: `${path}.type`,
      message: `"${type}" is not supported by the first AI-generation milestone.`,
    })
  }
  if (!key || !grid || !SUPPORTED_BLOCK_TYPES.has(type)) return null

  const shared = {
    key,
    ...(parentKey ? { parentKey } : {}),
    grid,
    ...(render ? { render } : {}),
  }

  if (type === 'hero') return parseHeroBlock(baseObject, path, shared, issues)
  if (type === 'text') return parseTextBlock(baseObject, path, shared, issues)
  if (type === 'button') return parseButtonBlock(baseObject, path, shared, issues)
  return parseRepeaterBlock(baseObject, path, shared, issues)
}

function parseHeroBlock(
  object: Record<string, unknown>,
  path: string,
  shared: Omit<AiHeroBlockPlan, 'type' | 'content' | 'headlineBinding'>,
  issues: AiGenerationPlanIssue[],
): AiHeroBlockPlan | null {
  rejectPresentKeys(object, path, ['collectionKey', 'valueBinding', 'action'], issues)
  const content = readObject(object.content, `${path}.content`, ['headline', 'headlineSize', 'contentPadding'], issues)
  if (!content) return null

  const headline = readRequiredString(content.headline, `${path}.content.headline`, issues, 240)
  const headlineSize = readOptionalNumber(content.headlineSize, `${path}.content.headlineSize`, issues, 8, 96)
  const contentPadding = readOptionalNumber(content.contentPadding, `${path}.content.contentPadding`, issues, 0, 80)
  const headlineBinding = object.headlineBinding === undefined
    ? undefined
    : parseCollectionBinding(object.headlineBinding, `${path}.headlineBinding`, issues)

  return {
    ...shared,
    type: 'hero',
    content: {
      headline,
      ...(headlineSize === undefined ? {} : { headlineSize }),
      ...(contentPadding === undefined ? {} : { contentPadding }),
    },
    ...(headlineBinding ? { headlineBinding } : {}),
  }
}

function parseTextBlock(
  object: Record<string, unknown>,
  path: string,
  shared: Omit<AiTextBlockPlan, 'type' | 'content' | 'valueBinding'>,
  issues: AiGenerationPlanIssue[],
): AiTextBlockPlan | null {
  rejectPresentKeys(object, path, ['collectionKey', 'headlineBinding', 'action'], issues)
  const content = readObject(
    object.content,
    `${path}.content`,
    [
      'value',
      'fontSize',
      'contentPadding',
      'textColor',
      'editable',
      'textInputMode',
      'inputType',
      'fieldLabel',
      'showFieldLabel',
      'fieldKey',
      'required',
      'placeholder',
      'backgroundColor',
      'placeholderColor',
      'borderColor',
      'borderWidth',
      'borderRadius',
    ],
    issues,
  )
  if (!content) return null

  const value = readOptionalString(content.value, `${path}.content.value`, issues, 600)
  const fontSize = readOptionalNumber(content.fontSize, `${path}.content.fontSize`, issues, 8, 96)
  const contentPadding = readOptionalNumber(content.contentPadding, `${path}.content.contentPadding`, issues, 0, 80)
  const textColor = readOptionalColor(content.textColor, `${path}.content.textColor`, issues)
  const editable = readOptionalBoolean(content.editable, `${path}.content.editable`, issues)
  const textInputMode = readOptionalEnum(
    content.textInputMode,
    `${path}.content.textInputMode`,
    ['singleLine', 'multiline'] as const,
    issues,
  )
  const inputType = readOptionalEnum(
    content.inputType,
    `${path}.content.inputType`,
    ['text', 'email', 'password', 'number'] as const,
    issues,
  )
  const fieldLabel = readOptionalString(content.fieldLabel, `${path}.content.fieldLabel`, issues, 80)
  const showFieldLabel = readOptionalBoolean(content.showFieldLabel, `${path}.content.showFieldLabel`, issues)
  const fieldKey = content.fieldKey === undefined
    ? undefined
    : readFieldKey(content.fieldKey, `${path}.content.fieldKey`, issues)
  const required = readOptionalBoolean(content.required, `${path}.content.required`, issues)
  const placeholder = readOptionalString(content.placeholder, `${path}.content.placeholder`, issues, 160)
  const backgroundColor = readOptionalColor(content.backgroundColor, `${path}.content.backgroundColor`, issues)
  const placeholderColor = readOptionalColor(content.placeholderColor, `${path}.content.placeholderColor`, issues)
  const borderColor = readOptionalColor(content.borderColor, `${path}.content.borderColor`, issues)
  const borderWidth = readOptionalNumber(content.borderWidth, `${path}.content.borderWidth`, issues, 0, 32)
  const borderRadius = readOptionalNumber(content.borderRadius, `${path}.content.borderRadius`, issues, 0, 999)
  const valueBinding = object.valueBinding === undefined
    ? undefined
    : parseCollectionBinding(object.valueBinding, `${path}.valueBinding`, issues)

  return {
    ...shared,
    type: 'text',
    content: compactObject({
      value,
      fontSize,
      contentPadding,
      textColor,
      editable,
      textInputMode,
      inputType,
      fieldLabel,
      showFieldLabel,
      fieldKey,
      required,
      placeholder,
      backgroundColor,
      placeholderColor,
      borderColor,
      borderWidth,
      borderRadius,
    }),
    ...(valueBinding ? { valueBinding } : {}),
  }
}

function parseButtonBlock(
  object: Record<string, unknown>,
  path: string,
  shared: Omit<AiButtonBlockPlan, 'type' | 'content' | 'action'>,
  issues: AiGenerationPlanIssue[],
): AiButtonBlockPlan | null {
  rejectPresentKeys(object, path, ['collectionKey', 'headlineBinding', 'valueBinding'], issues)
  const content = readObject(
    object.content,
    `${path}.content`,
    [
      'label',
      'dataSourceName',
      'successMessage',
      'fontSize',
      'buttonPaddingX',
      'buttonPaddingY',
      'backgroundColor',
      'textColor',
      'borderRadius',
    ],
    issues,
  )
  if (!content) return null

  const label = readRequiredString(content.label, `${path}.content.label`, issues, 100)
  const dataSourceName = readOptionalString(content.dataSourceName, `${path}.content.dataSourceName`, issues, 80)
  const successMessage = readOptionalString(content.successMessage, `${path}.content.successMessage`, issues, 160)
  const fontSize = readOptionalNumber(content.fontSize, `${path}.content.fontSize`, issues, 8, 72)
  const buttonPaddingX = readOptionalNumber(content.buttonPaddingX, `${path}.content.buttonPaddingX`, issues, 0, 80)
  const buttonPaddingY = readOptionalNumber(content.buttonPaddingY, `${path}.content.buttonPaddingY`, issues, 0, 80)
  const backgroundColor = readOptionalColor(content.backgroundColor, `${path}.content.backgroundColor`, issues)
  const textColor = readOptionalColor(content.textColor, `${path}.content.textColor`, issues)
  const borderRadius = readOptionalNumber(content.borderRadius, `${path}.content.borderRadius`, issues, 0, 999)
  const action = object.action === undefined
    ? undefined
    : parseButtonAction(object.action, `${path}.action`, issues)

  return {
    ...shared,
    type: 'button',
    content: compactObject({
      label,
      dataSourceName,
      successMessage,
      fontSize,
      buttonPaddingX,
      buttonPaddingY,
      backgroundColor,
      textColor,
      borderRadius,
    }),
    ...(action ? { action } : {}),
  }
}

function parseRepeaterBlock(
  object: Record<string, unknown>,
  path: string,
  shared: Omit<AiRepeaterBlockPlan, 'type' | 'collectionKey' | 'content'>,
  issues: AiGenerationPlanIssue[],
): AiRepeaterBlockPlan | null {
  rejectPresentKeys(object, path, ['headlineBinding', 'valueBinding', 'action'], issues)
  const collectionKey = readKey(object.collectionKey, `${path}.collectionKey`, issues)
  const content = object.content === undefined
    ? undefined
    : parseRepeaterContent(object.content, `${path}.content`, issues)

  if (!collectionKey) return null
  return {
    ...shared,
    type: 'repeater',
    collectionKey,
    ...(content ? { content } : {}),
  }
}

function parseRepeaterContent(
  value: unknown,
  path: string,
  issues: AiGenerationPlanIssue[],
): NonNullable<AiRepeaterBlockPlan['content']> | null {
  const object = readObject(
    value,
    path,
    [
      'scope',
      'order',
      'limit',
      'itemRowSpan',
      'gapRows',
      'emptyText',
      'backgroundColor',
      'borderColor',
      'borderWidth',
      'borderRadius',
      'opacity',
    ],
    issues,
  )
  if (!object) return null

  return compactObject({
    scope: readOptionalEnum(object.scope, `${path}.scope`, ['all', 'currentUser'] as const, issues),
    order: readOptionalEnum(object.order, `${path}.order`, ['newest', 'oldest'] as const, issues),
    limit: readOptionalInteger(object.limit, `${path}.limit`, issues, 1, 20),
    itemRowSpan: readOptionalInteger(object.itemRowSpan, `${path}.itemRowSpan`, issues, 1, 29),
    gapRows: readOptionalInteger(object.gapRows, `${path}.gapRows`, issues, 0, 29),
    emptyText: readOptionalString(object.emptyText, `${path}.emptyText`, issues, 160),
    backgroundColor: readOptionalColor(object.backgroundColor, `${path}.backgroundColor`, issues),
    borderColor: readOptionalColor(object.borderColor, `${path}.borderColor`, issues),
    borderWidth: readOptionalNumber(object.borderWidth, `${path}.borderWidth`, issues, 0, 32),
    borderRadius: readOptionalNumber(object.borderRadius, `${path}.borderRadius`, issues, 0, 999),
    opacity: readOptionalNumber(object.opacity, `${path}.opacity`, issues, 0, 1),
  })
}

function parseButtonAction(
  value: unknown,
  path: string,
  issues: AiGenerationPlanIssue[],
): AiButtonActionPlan | null {
  const base = readObject(value, path, ['type', 'targetPageKey', 'collectionKey', 'fields'], issues)
  if (!base) return null
  const type = readEnum(base.type, `${path}.type`, ['navigate', 'submitData'] as const, issues)
  if (!type) return null

  if (type === 'navigate') {
    rejectPresentKeys(base, path, ['collectionKey', 'fields'], issues)
    const targetPageKey = readKey(base.targetPageKey, `${path}.targetPageKey`, issues)
    return targetPageKey ? { type, targetPageKey } : null
  }

  rejectPresentKeys(base, path, ['targetPageKey'], issues)
  const collectionKey = readKey(base.collectionKey, `${path}.collectionKey`, issues)
  const fields = parseArray(base.fields, `${path}.fields`, issues, parseSubmitField, { min: 1, max: 30 })
  const fieldBlockKeys = fields.map((field) => ({ key: field.fieldBlockKey }))
  validateUniqueKeys(fieldBlockKeys, `${path}.fields`, issues)
  if (!collectionKey) return null
  return { type, collectionKey, fields }
}

function parseSubmitField(value: unknown, path: string, issues: AiGenerationPlanIssue[]): AiSubmitFieldPlan | null {
  const object = readObject(value, path, ['fieldBlockKey', 'targetFieldKey'], issues)
  if (!object) return null
  const fieldBlockKey = readKey(object.fieldBlockKey, `${path}.fieldBlockKey`, issues)
  const targetFieldKey = readFieldKey(object.targetFieldKey, `${path}.targetFieldKey`, issues)
  if (!fieldBlockKey || !targetFieldKey) return null
  return { fieldBlockKey, targetFieldKey }
}

function parseCollectionBinding(
  value: unknown,
  path: string,
  issues: AiGenerationPlanIssue[],
): AiCollectionBindingPlan | null {
  const object = readObject(value, path, ['collectionKey', 'fieldKey', 'record', 'fallback'], issues)
  if (!object) return null
  const collectionKey = readKey(object.collectionKey, `${path}.collectionKey`, issues)
  const fieldKey = readFieldKey(object.fieldKey, `${path}.fieldKey`, issues)
  const record = readEnum(object.record, `${path}.record`, ['latest', 'currentItem'] as const, issues)
  const fallback = readOptionalString(object.fallback, `${path}.fallback`, issues, 240)
  if (!collectionKey || !fieldKey || !record) return null
  return {
    collectionKey,
    fieldKey,
    record,
    ...(fallback === undefined ? {} : { fallback }),
  }
}

function parseGridPlacement(
  value: unknown,
  path: string,
  issues: AiGenerationPlanIssue[],
): GridPlacement | null {
  const object = readObject(value, path, ['colStart', 'rowStart', 'colSpan', 'rowSpan'], issues)
  if (!object) return null
  const colStart = readInteger(object.colStart, `${path}.colStart`, issues, 1, 128)
  const rowStart = readInteger(object.rowStart, `${path}.rowStart`, issues, 1, 128)
  const colSpan = readInteger(object.colSpan, `${path}.colSpan`, issues, 1, 64)
  const rowSpan = readInteger(object.rowSpan, `${path}.rowSpan`, issues, 1, 64)
  return { colStart, rowStart, colSpan, rowSpan }
}

function parseRender(
  value: unknown,
  path: string,
  issues: AiGenerationPlanIssue[],
): AiBlockRenderPlan | null {
  const object = readObject(value, path, ['alignX', 'alignY'], issues)
  if (!object) return null
  return compactObject({
    alignX: readOptionalEnum(object.alignX, `${path}.alignX`, ['start', 'center', 'end'] as const, issues),
    alignY: readOptionalEnum(object.alignY, `${path}.alignY`, ['start', 'center', 'end'] as const, issues),
  })
}

function readObject(
  value: unknown,
  path: string,
  allowedKeys: readonly string[],
  issues: AiGenerationPlanIssue[],
): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    issues.push({ code: 'invalid-object', path, message: 'Expected an object.' })
    return null
  }
  const object = value as Record<string, unknown>
  const allowed = new Set(allowedKeys)
  for (const key of Object.keys(object)) {
    if (!allowed.has(key)) {
      issues.push({
        code: 'unknown-property',
        path: `${path}.${key}`,
        message: `Unknown property "${key}".`,
      })
    }
  }
  return object
}

function parseArray<T>(
  value: unknown,
  path: string,
  issues: AiGenerationPlanIssue[],
  parser: (entry: unknown, entryPath: string, issues: AiGenerationPlanIssue[]) => T | null,
  limits: { min: number; max: number },
): T[] {
  if (!Array.isArray(value)) {
    issues.push({ code: 'invalid-array', path, message: 'Expected an array.' })
    return []
  }
  if (value.length < limits.min || value.length > limits.max) {
    issues.push({
      code: 'invalid-array-length',
      path,
      message: `Expected between ${limits.min} and ${limits.max} entries.`,
    })
  }
  return value
    .map((entry, index) => parser(entry, `${path}[${index}]`, issues))
    .filter((entry): entry is T => entry !== null)
}

function readRequiredString(
  value: unknown,
  path: string,
  issues: AiGenerationPlanIssue[],
  maxLength: number,
): string {
  if (typeof value !== 'string' || !value.trim()) {
    issues.push({ code: 'invalid-string', path, message: 'Expected a non-empty string.' })
    return ''
  }
  const next = value.trim()
  if (next.length > maxLength) {
    issues.push({ code: 'string-too-long', path, message: `Must be ${maxLength} characters or fewer.` })
  }
  return next.slice(0, maxLength)
}

function readOptionalString(
  value: unknown,
  path: string,
  issues: AiGenerationPlanIssue[],
  maxLength: number,
): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string') {
    issues.push({ code: 'invalid-string', path, message: 'Expected a string.' })
    return undefined
  }
  const next = value.trim()
  if (next.length > maxLength) {
    issues.push({ code: 'string-too-long', path, message: `Must be ${maxLength} characters or fewer.` })
  }
  return next.slice(0, maxLength)
}

function readKey(value: unknown, path: string, issues: AiGenerationPlanIssue[]): string {
  const key = readRequiredString(value, path, issues, 80)
  if (key && !KEY_PATTERN.test(key)) {
    issues.push({
      code: 'invalid-key',
      path,
      message: 'Use lowercase letters, numbers, and hyphens, starting with a letter.',
    })
  }
  return key
}

function readFieldKey(value: unknown, path: string, issues: AiGenerationPlanIssue[]): string {
  const key = readRequiredString(value, path, issues, 80)
  if (key && !FIELD_KEY_PATTERN.test(key)) {
    issues.push({
      code: 'invalid-field-key',
      path,
      message: 'Use lowercase letters, numbers, and underscores, starting with a letter.',
    })
  }
  return key
}

function readInteger(
  value: unknown,
  path: string,
  issues: AiGenerationPlanIssue[],
  min: number,
  max: number,
): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    issues.push({ code: 'invalid-integer', path, message: `Expected an integer from ${min} to ${max}.` })
    return min
  }
  return value
}

function readOptionalInteger(
  value: unknown,
  path: string,
  issues: AiGenerationPlanIssue[],
  min: number,
  max: number,
): number | undefined {
  if (value === undefined) return undefined
  return readInteger(value, path, issues, min, max)
}

function readOptionalNumber(
  value: unknown,
  path: string,
  issues: AiGenerationPlanIssue[],
  min: number,
  max: number,
): number | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    issues.push({ code: 'invalid-number', path, message: `Expected a number from ${min} to ${max}.` })
    return undefined
  }
  return value
}

function readOptionalBoolean(
  value: unknown,
  path: string,
  issues: AiGenerationPlanIssue[],
): boolean | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') {
    issues.push({ code: 'invalid-boolean', path, message: 'Expected true or false.' })
    return undefined
  }
  return value
}

function readEnum<T extends string>(
  value: unknown,
  path: string,
  allowed: readonly T[],
  issues: AiGenerationPlanIssue[],
): T | null {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    issues.push({ code: 'invalid-enum', path, message: `Expected one of: ${allowed.join(', ')}.` })
    return null
  }
  return value as T
}

function readOptionalEnum<T extends string>(
  value: unknown,
  path: string,
  allowed: readonly T[],
  issues: AiGenerationPlanIssue[],
): T | undefined {
  if (value === undefined) return undefined
  return readEnum(value, path, allowed, issues) ?? undefined
}

function readOptionalColor(
  value: unknown,
  path: string,
  issues: AiGenerationPlanIssue[],
): string | undefined {
  const color = readOptionalString(value, path, issues, 7)
  if (color === undefined) return undefined
  if (!HEX_COLOR_PATTERN.test(color)) {
    issues.push({ code: 'invalid-color', path, message: 'Expected a six-digit hexadecimal color.' })
  }
  return color
}

function rejectPresentKeys(
  object: Record<string, unknown>,
  path: string,
  keys: readonly string[],
  issues: AiGenerationPlanIssue[],
) {
  for (const key of keys) {
    if (object[key] !== undefined) {
      issues.push({
        code: 'property-not-allowed',
        path: `${path}.${key}`,
        message: `"${key}" is not allowed for this block type.`,
      })
    }
  }
}

function validateUniqueKeys(
  entries: Array<{ key: string }>,
  path: string,
  issues: AiGenerationPlanIssue[],
) {
  const seen = new Set<string>()
  entries.forEach((entry, index) => {
    if (!entry.key || seen.has(entry.key)) {
      if (entry.key) {
        issues.push({
          code: 'duplicate-key',
          path: `${path}[${index}].key`,
          message: `Duplicate key "${entry.key}".`,
        })
      }
      return
    }
    seen.add(entry.key)
  })
}

function compactObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T
}
