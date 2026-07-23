import type { Block, BlockAction, SubmitDataFieldRef } from '../schema/types'
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
      fields: normalizeSubmitFields(action.fields),
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
  if (action.type === 'signUpAppUser') {
    const displayNameFieldBlockId = readString(action.displayNameFieldBlockId)
    return {
      type: 'signUpAppUser',
      ...(displayNameFieldBlockId ? { displayNameFieldBlockId } : {}),
      emailFieldBlockId: readString(action.emailFieldBlockId),
      passwordFieldBlockId: readString(action.passwordFieldBlockId),
    }
  }
  if (action.type === 'loginAppUser') {
    return {
      type: 'loginAppUser',
      emailFieldBlockId: readString(action.emailFieldBlockId),
      passwordFieldBlockId: readString(action.passwordFieldBlockId),
    }
  }
  if (action.type === 'logoutAppUser') {
    return { type: 'logoutAppUser' }
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
  if (action.type === 'submitData') {
    return action.fields.length > 0
      && (!action.collectionId || action.fields.every((field) => Boolean(field.targetFieldKey)))
  }
  if (action.type === 'openUrl') return isSupportedExternalUrl(action.url)
  if (action.type === 'setPageState') return Boolean(action.variableId.trim())
  if (action.type === 'signUpAppUser' || action.type === 'loginAppUser') {
    return Boolean(action.emailFieldBlockId.trim() && action.passwordFieldBlockId.trim())
  }
  return action.type === 'logoutAppUser'
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

function normalizeSubmitFields(value: unknown): SubmitDataFieldRef[] {
  if (!Array.isArray(value)) return []
  const fields = new Map<string, SubmitDataFieldRef>()

  for (const candidate of value) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue
    const field = candidate as Record<string, unknown>
    const fieldBlockId = readString(field.fieldBlockId)
    if (!fieldBlockId || fields.has(fieldBlockId)) continue
    const targetFieldKey = readString(field.targetFieldKey)
    fields.set(fieldBlockId, {
      fieldBlockId,
      ...(targetFieldKey ? { targetFieldKey } : {}),
    })
  }

  return Array.from(fields.values())
}
