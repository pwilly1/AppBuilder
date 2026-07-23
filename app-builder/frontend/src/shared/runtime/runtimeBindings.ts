import type { Block, CollectionRecordSelector, Page, RuntimeValueRef } from '../schema/types'

export type RuntimeContext = {
  pageState: Record<string, string>
  collectionData: Record<string, RuntimeDataState>
}

export type RuntimeDataState =
  | { status: 'loading' }
  | { status: 'ready'; recordId: string; values: Record<string, string> }
  | { status: 'empty' }
  | { status: 'error'; message: string }

export type CollectionDataRequest = {
  key: string
  collectionId: string
  record: CollectionRecordSelector
}

export const EMPTY_RUNTIME_CONTEXT: RuntimeContext = { pageState: {}, collectionData: {} }

export function createPageRuntimeContext(page: Pick<Page, 'stateVariables'>): RuntimeContext {
  const pageState: Record<string, string> = {}

  for (const variable of page.stateVariables || []) {
    if (!variable?.id || variable.type !== 'text') continue
    pageState[variable.id] = typeof variable.initialValue === 'string' ? variable.initialValue : ''
  }

  return { pageState, collectionData: {} }
}

export function resolveRuntimeValue(
  reference: RuntimeValueRef | unknown,
  context: RuntimeContext,
  staticFallback?: unknown,
): unknown {
  const normalized = normalizeRuntimeValueRef(reference)
  if (!normalized) return staticFallback
  if (normalized.source === 'static') return normalized.value
  if (normalized.source === 'formValue') return normalized.fallback ?? staticFallback
  if (normalized.source === 'collection') {
    const state = context.collectionData[getCollectionDataKey(normalized.collectionId, normalized.record)]
    if (state?.status === 'ready' && Object.prototype.hasOwnProperty.call(state.values, normalized.fieldId)) {
      return state.values[normalized.fieldId]
    }
    return normalized.fallback ?? staticFallback
  }
  const pageStateReference = normalized
  if (Object.prototype.hasOwnProperty.call(context.pageState, pageStateReference.variableId)) {
    return context.pageState[pageStateReference.variableId]
  }
  return typeof pageStateReference.fallback === 'string' ? pageStateReference.fallback : staticFallback
}

export function resolveActionRuntimeValue(
  reference: RuntimeValueRef | unknown,
  context: RuntimeContext,
  getFieldValue?: (fieldBlockId: string) => unknown,
  staticFallback?: unknown,
): unknown {
  const normalized = normalizeRuntimeValueRef(reference)
  if (normalized?.source === 'formValue') {
    return getFieldValue?.(normalized.fieldBlockId) ?? normalized.fallback ?? staticFallback
  }
  return resolveRuntimeValue(normalized, context, staticFallback)
}

export function resolveBlockProps(block: Block, context: RuntimeContext = EMPTY_RUNTIME_CONTEXT): Record<string, unknown> {
  const props = { ...(block.props as Record<string, unknown>) }

  for (const [propertyName, reference] of Object.entries(block.bindings || {})) {
    const resolved = resolveRuntimeValue(reference, context, props[propertyName])
    if (resolved !== undefined) props[propertyName] = resolved
  }

  return props
}

export function hasPageStateBinding(block: Block, propertyName: string): boolean {
  return isPageStateReference(block.bindings?.[propertyName])
}

export function hasDynamicBinding(block: Block, propertyName: string): boolean {
  const source = normalizeRuntimeValueRef(block.bindings?.[propertyName])?.source
  return source === 'pageState' || source === 'collection'
}

export function collectBoundCollectionRequests(page: Pick<Page, 'blocks'>): CollectionDataRequest[] {
  const requests = new Map<string, CollectionDataRequest>()

  for (const block of page.blocks || []) {
    for (const reference of Object.values(block.bindings || {})) {
      const normalized = normalizeRuntimeValueRef(reference)
      if (normalized?.source !== 'collection') continue
      const key = getCollectionDataKey(normalized.collectionId, normalized.record)
      requests.set(key, {
        key,
        collectionId: normalized.collectionId,
        record: normalized.record ?? { mode: 'latest' },
      })
    }
  }

  return Array.from(requests.values())
}

export function getCollectionDataKey(
  collectionId: string,
  record: CollectionRecordSelector = { mode: 'latest' },
): string {
  return record.mode === 'specific'
    ? `${collectionId}::specific:${record.recordId}`
    : `${collectionId}::latest`
}

export function normalizeRuntimeValueRef(value: unknown): RuntimeValueRef | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const reference = value as Record<string, unknown>
  if (reference.source === 'static') {
    return { source: 'static', value: typeof reference.value === 'string' ? reference.value : '' }
  }
  if (reference.source === 'pageState' && typeof reference.variableId === 'string' && reference.variableId.length > 0) {
    return {
      source: 'pageState',
      variableId: reference.variableId,
      ...(typeof reference.fallback === 'string' ? { fallback: reference.fallback } : {}),
    }
  }
  if (reference.source === 'formValue' && typeof reference.fieldBlockId === 'string' && reference.fieldBlockId.length > 0) {
    return {
      source: 'formValue',
      fieldBlockId: reference.fieldBlockId,
      ...(typeof reference.fallback === 'string' ? { fallback: reference.fallback } : {}),
    }
  }
  if (
    reference.source === 'collection'
    && typeof reference.collectionId === 'string'
    && reference.collectionId.length > 0
    && typeof reference.fieldId === 'string'
    && reference.fieldId.length > 0
  ) {
    const record = normalizeCollectionRecordSelector(reference.record)
    if (!record) return null
    return {
      source: 'collection',
      collectionId: reference.collectionId,
      fieldId: reference.fieldId,
      record,
      ...(typeof reference.fallback === 'string' ? { fallback: reference.fallback } : {}),
    }
  }
  return null
}

function normalizeCollectionRecordSelector(value: unknown): CollectionRecordSelector | null {
  if (value === undefined) return { mode: 'latest' }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const selector = value as Record<string, unknown>
  if (selector.mode === 'latest') return { mode: 'latest' }
  if (selector.mode === 'specific' && typeof selector.recordId === 'string' && selector.recordId.trim()) {
    return { mode: 'specific', recordId: selector.recordId.trim() }
  }
  return null
}

function isPageStateReference(
  value: unknown,
): value is Extract<RuntimeValueRef, { source: 'pageState' }> {
  return normalizeRuntimeValueRef(value)?.source === 'pageState'
}
