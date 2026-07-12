import type { Block, BlockAction } from '../schema/types'

export function normalizeBlockAction(value: unknown): BlockAction | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const action = value as Record<string, unknown>

  if (action.type === 'navigate') {
    return { type: 'navigate', targetPageId: readString(action.targetPageId) }
  }
  if (action.type === 'submitData') {
    return { type: 'submitData', submitGroupId: readString(action.submitGroupId) || 'default' }
  }
  if (action.type === 'openUrl') {
    return { type: 'openUrl', url: readString(action.url) }
  }
  return null
}

export function resolveBlockAction(block: Block): BlockAction | null {
  const props = block.props as Record<string, unknown>
  const action = normalizeBlockAction(props.action)
  if (action) return action

  if (block.type === 'navButton') {
    return { type: 'navigate', targetPageId: readString(props.toPageId) }
  }
  if (block.type === 'submitButton') {
    return { type: 'submitData', submitGroupId: readString(props.submitGroupId) || 'default' }
  }
  return null
}

export function isActionConfigured(action: BlockAction | null | undefined): boolean {
  if (!action) return false
  if (action.type === 'navigate') return Boolean(action.targetPageId.trim())
  if (action.type === 'submitData') return Boolean(action.submitGroupId.trim())
  return isSupportedExternalUrl(action.url)
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
