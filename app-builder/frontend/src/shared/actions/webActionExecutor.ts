import { submitPublicAppDataRecord } from '../../api'
import type { FormRuntimeContextValue } from '../blocks/formRuntime'
import type { BlockAction } from '../schema/types'
import { isSupportedExternalUrl } from './blockActions'

export type WebActionContext = {
  onNavigate?: (pageId: string) => void
  projectId?: string
  sourceBlockId?: string
  formRuntime?: Pick<FormRuntimeContextValue, 'getGroupValues'> | null
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

  if (!context.projectId || !context.sourceBlockId) throw new Error('Save the project before submitting data.')
  const values = context.formRuntime?.getGroupValues(action.submitGroupId) || {}
  await submitPublicAppDataRecord(context.projectId, context.sourceBlockId, values)
}
