import { useState } from 'react'
import { submitPublicAppDataRecord } from '../../api'
import { resolveSubmitGroupId, useFormRuntime } from './formRuntime'

export function SubmitButton({
  blockId,
  projectId,
  previewMode,
  label = 'Submit',
  submitGroupId = 'default',
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
  label?: string
  submitGroupId?: string
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
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const canSubmit = Boolean(previewMode && projectId && blockId)
  const safeScale = Math.max(0.1, Number(contentScale) || 1)
  const safeFontSize = Math.max(8, Number(fontSize) || 14) * safeScale

  async function submit() {
    if (!canSubmit || !projectId || !blockId || status === 'submitting') return
    setStatus('submitting')
    setErrorMessage('')
    try {
      const groupValues = formRuntime?.getGroupValues(resolveSubmitGroupId(submitGroupId)) || {}
      await submitPublicAppDataRecord(projectId, blockId, groupValues)
      setStatus('success')
    } catch (error: any) {
      setStatus('error')
      setErrorMessage(error?.message || 'Submission failed.')
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
        disabled={!canSubmit || status === 'submitting'}
        onClick={submit}
        style={{
          border: 0,
          borderRadius: Math.max(0, Number(borderRadius) || 0) * safeScale,
          backgroundColor: canSubmit ? backgroundColor || '#2563eb' : '#cbd5e1',
          color: textColor || '#ffffff',
          cursor: canSubmit ? 'pointer' : 'default',
          fontSize: safeFontSize,
          fontWeight: 700,
          lineHeight: 1.1,
          padding: `${Math.max(0, Number(buttonPaddingY) || 0) * safeScale}px ${Math.max(0, Number(buttonPaddingX) || 0) * safeScale}px`,
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {status === 'submitting' ? 'Submitting...' : label || 'Submit'}
      </button>
      {previewMode && status === 'success' ? (
        <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: '#047857' }}>{successMessage}</div>
      ) : null}
      {previewMode && status === 'error' ? (
        <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: '#dc2626' }}>{errorMessage}</div>
      ) : null}
    </div>
  )
}
