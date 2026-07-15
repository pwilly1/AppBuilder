import { useState } from 'react'
import type { BlockAction } from '../schema/types'
import { isActionConfigured } from '../actions/blockActions'
import { executeWebBlockAction } from '../actions/webActionExecutor'
import type { RuntimeContext } from '../runtime/runtimeBindings'
import { useFormRuntime } from './formRuntime'

type ButtonStatus = 'idle' | 'submitting' | 'success' | 'error'

export function ButtonBlock({
  blockId,
  projectId,
  previewMode,
  action,
  onNavigate,
  runtimeContext,
  onSetPageState,
  label = 'Button',
  successMessage = 'Submission received.',
  fontSize = 14,
  contentPadding = 12,
  buttonPaddingX = 14,
  buttonPaddingY = 10,
  borderRadius = 10,
  backgroundColor = '#2563eb',
  textColor = '#ffffff',
  contentScale = 1,
}: {
  blockId?: string
  projectId?: string
  previewMode?: boolean
  action?: BlockAction | null
  onNavigate?: (pageId: string) => void
  runtimeContext?: RuntimeContext
  onSetPageState?: (variableId: string, value: string) => void
  label?: string
  successMessage?: string
  fontSize?: number
  contentPadding?: number
  buttonPaddingX?: number
  buttonPaddingY?: number
  borderRadius?: number
  backgroundColor?: string
  textColor?: string
  contentScale?: number
}) {
  const formRuntime = useFormRuntime()
  const [status, setStatus] = useState<ButtonStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const safeScale = Math.max(0.1, Number(contentScale) || 1)
  const isSubmitAction = action?.type === 'submitData'
  const configured = isActionConfigured(action)
  const canSubmit = Boolean(projectId && blockId && configured)
  const canRun = Boolean(previewMode && action && configured && (!isSubmitAction || canSubmit))

  async function runAction() {
    if (!canRun || !action || status === 'submitting') return
    if (!isSubmitAction) {
      await executeWebBlockAction(action, { onNavigate, runtimeContext, onSetPageState, formRuntime })
      return
    }

    setStatus('submitting')
    setErrorMessage('')
    try {
      await executeWebBlockAction(action, {
        projectId,
        sourceBlockId: blockId,
        formRuntime,
      })
      setStatus('success')
    } catch (error: unknown) {
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Submission failed.')
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: Math.max(0, Number(contentPadding) || 0) * safeScale,
        overflow: 'hidden',
        pointerEvents: previewMode ? 'auto' : 'none',
      }}
    >
      <button
        type="button"
        aria-disabled={!canRun}
        onClick={() => void runAction()}
        style={{
          border: 0,
          borderRadius: Math.max(0, Number(borderRadius) || 0) * safeScale,
          backgroundColor: backgroundColor || '#2563eb',
          color: textColor || '#ffffff',
          cursor: canRun ? 'pointer' : 'default',
          fontSize: Math.max(8, Number(fontSize) || 14) * safeScale,
          fontWeight: 700,
          lineHeight: 1.1,
          padding: `${Math.max(0, Number(buttonPaddingY) || 0) * safeScale}px ${Math.max(0, Number(buttonPaddingX) || 0) * safeScale}px`,
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {status === 'submitting' ? 'Submitting...' : label || 'Button'}
      </button>
      {previewMode && isSubmitAction && status === 'success' ? (
        <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: '#047857' }}>{successMessage}</div>
      ) : null}
      {previewMode && isSubmitAction && status === 'error' ? (
        <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: '#dc2626' }}>{errorMessage}</div>
      ) : null}
    </div>
  )
}
