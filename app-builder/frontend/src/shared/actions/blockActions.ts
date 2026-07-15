import type { Block, BlockAction } from '../schema/types'
import { normalizeRuntimeValueRef } from '../runtime/runtimeBindings'

export function normalizeBlockAction(value: unknown): BlockAction | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const action = value as Record<string, unknown>

  if (action.type === 'navigate') {
    return { type: 'navigate', targetPageId: readString(action.targetPageId) }
  }
  if (action.type === 'submitData') {
    const collectionId = readString(action.collectionId)
    return {
      type: 'submitData',
      submitGroupId: readString(action.submitGroupId) || 'default',
      ...(collectionId ? { collectionId } : {}),
    }
  }
  if (action.type === 'openUrl') {
    return { type: 'openUrl', url: readString(action.url) }
  }
  if (action.type === 'setPageState') {
    return {
      type: 'setPageState',
      variableId: readString(action.variableId),
      value: normalizeRuntimeValueRef(action.value) ?? { source: 'static', value: '' },
    }
  }
  return null
}

export function resolveBlockAction(block: Block): BlockAction | null {
  const props = block.props as Record<string, unknown>
  const action = normalizeBlockAction(props.action)
  if (action) return action

  return null
}

export function isActionConfigured(action: BlockAction | null | undefined): boolean {
  if (!action) return false
  if (action.type === 'navigate') return Boolean(action.targetPageId.trim())
  if (action.type === 'submitData') return Boolean(action.submitGroupId.trim())
  if (action.type === 'openUrl') return isSupportedExternalUrl(action.url)
  return Boolean(action.variableId.trim())
}

export function isSupportedExternalUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}
