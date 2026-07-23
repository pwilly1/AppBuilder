import {
  loginRuntimeAppUser,
  logoutRuntimeAppUser,
  signupRuntimeAppUser,
  submitPublicAppDataRecord,
} from '../../api'
import type { FormRuntimeContextValue } from '../blocks/formRuntime'
import type { BlockAction } from '../schema/types'
import { isSupportedExternalUrl } from './blockActions'
import { EMPTY_RUNTIME_CONTEXT, resolveActionRuntimeValue, type RuntimeContext } from '../runtime/runtimeBindings'

export type WebActionContext = {
  onNavigate?: (pageId: string) => void
  projectId?: string
  sourceBlockId?: string
  formRuntime?: Pick<FormRuntimeContextValue, 'getFieldValues' | 'getFieldValue'> | null
  runtimeContext?: RuntimeContext
  onSetPageState?: (variableId: string, value: string) => void
}

export async function executeWebBlockAction(action: BlockAction, context: WebActionContext): Promise<void> {
  if (action.type === 'navigate') {
    if (!action.targetPageId) throw new Error('Choose a destination page.')
    if (!context.onNavigate) throw new Error('Navigation is unavailable.')
    context.onNavigate(action.targetPageId)
    return
  }

  if (action.type === 'openUrl') {
    if (!isSupportedExternalUrl(action.url)) throw new Error('Enter a valid HTTP or HTTPS URL.')
    window.open(action.url, '_blank', 'noopener,noreferrer')
    return
  }

  if (action.type === 'setPageState') {
    if (!action.variableId) throw new Error('Choose a page variable.')
    if (!context.onSetPageState) throw new Error('Page state is unavailable.')
    const value = resolveActionRuntimeValue(
      action.value,
      context.runtimeContext ?? EMPTY_RUNTIME_CONTEXT,
      context.formRuntime?.getFieldValue,
      '',
    )
    context.onSetPageState(action.variableId, typeof value === 'string' ? value : String(value ?? ''))
    return
  }

  if (
    action.type === 'signUpAppUser'
    || action.type === 'loginAppUser'
    || action.type === 'logoutAppUser'
  ) {
    if (!context.projectId) throw new Error('Save the project before using app accounts.')
    if (action.type === 'logoutAppUser') {
      logoutRuntimeAppUser(context.projectId)
      return
    }

    const email = readFieldString(context, action.emailFieldBlockId)
    const password = readFieldString(context, action.passwordFieldBlockId, false)
    if (!email || !password) throw new Error('Enter an email and password.')

    if (action.type === 'loginAppUser') {
      await loginRuntimeAppUser(context.projectId, { email, password })
      return
    }

    const displayName = action.displayNameFieldBlockId
      ? readFieldString(context, action.displayNameFieldBlockId)
      : ''
    await signupRuntimeAppUser(context.projectId, { displayName, email, password })
    return
  }

  if (!context.projectId || !context.sourceBlockId) throw new Error('Save the project before submitting data.')
  const values = context.formRuntime?.getFieldValues(action.fields) || {}
  await submitPublicAppDataRecord(context.projectId, context.sourceBlockId, values)
}

function readFieldString(context: WebActionContext, fieldBlockId: string, trim = true): string {
  const value = context.formRuntime?.getFieldValue(fieldBlockId)
  if (typeof value !== 'string') return ''
  return trim ? value.trim() : value
}
