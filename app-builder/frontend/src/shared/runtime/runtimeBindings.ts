import type { Block, Page, RuntimeValueRef } from '../schema/types'

export type RuntimeContext = {
  pageState: Record<string, string>
}

export const EMPTY_RUNTIME_CONTEXT: RuntimeContext = { pageState: {} }

export function createPageRuntimeContext(page: Pick<Page, 'stateVariables'>): RuntimeContext {
  const pageState: Record<string, string> = {}

  for (const variable of page.stateVariables || []) {
    if (!variable?.id || variable.type !== 'text') continue
    pageState[variable.id] = typeof variable.initialValue === 'string' ? variable.initialValue : ''
  }

  return { pageState }
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
  return null
}

function isPageStateReference(
  value: unknown,
): value is Extract<RuntimeValueRef, { source: 'pageState' }> {
  return normalizeRuntimeValueRef(value)?.source === 'pageState'
}
