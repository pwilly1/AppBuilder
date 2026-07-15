import type { ReactNode } from 'react'
import { useState } from 'react'
import { submitPublicProjectForm } from '../../api'
import { FormRuntimeProvider, resolveSubmitGroupId, type FormValue } from './formRuntime'

type FormBlockProps = {
  blockId?: string
  projectId?: string
  previewMode?: boolean
  title?: string
  description?: string
  submitLabel?: string
  successMessage?: string
  backgroundColor?: string
  borderColor?: string
  borderWidth?: number
  borderRadius?: number
  contentPadding?: number
  children?: ReactNode
}

export function FormBlock({
  blockId,
  projectId,
  previewMode,
  title = '',
  description = '',
  submitLabel = 'Submit',
  successMessage = 'Submission received.',
  backgroundColor = '#ffffff',
  borderColor = '#dbe3ef',
  borderWidth = 1,
  borderRadius = 18,
  contentPadding = 16,
  children,
}: FormBlockProps) {
  const [values, setValues] = useState<Record<string, Record<string, FormValue>>>({})
  const [fieldValuesByBlockId, setFieldValuesByBlockId] = useState<Record<string, FormValue>>({})
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const canSubmit = Boolean(previewMode && projectId && blockId)

  function setValue(fieldKey: string, value: FormValue, submitGroupId?: string, fieldBlockId?: string) {
    const groupId = resolveSubmitGroupId(submitGroupId ?? blockId)
    setValues((current) => ({ ...current, [groupId]: { ...(current[groupId] || {}), [fieldKey]: value } }))
    if (fieldBlockId) {
      setFieldValuesByBlockId((current) => ({ ...current, [fieldBlockId]: value }))
    }
    if (status !== 'idle') {
      setStatus('idle')
      setErrorMessage('')
    }
  }

  async function submit() {
    if (!canSubmit || !projectId || !blockId || status === 'submitting') return
    setStatus('submitting')
    setErrorMessage('')
    try {
      const mergedValues = Object.values(values).reduce<Record<string, FormValue>>(
        (merged, groupValues) => ({ ...merged, ...groupValues }),
        {},
      )
      await submitPublicProjectForm(projectId, blockId, mergedValues)
      setStatus('success')
    } catch (error: any) {
      setStatus('error')
      setErrorMessage(error?.message || 'Submission failed.')
    }
  }

  if (!previewMode) {
    return (
      <FormRuntimeProvider value={{
        values,
        fieldValuesByBlockId,
        setValue,
        getGroupValues: (groupId) => values[resolveSubmitGroupId(groupId ?? blockId)] || {},
        getFieldValue: (fieldBlockId) => fieldValuesByBlockId[fieldBlockId],
        previewMode,
      }}>
        <div className="relative h-full w-full overflow-hidden">
          <div className="absolute inset-0">{children}</div>
        </div>
      </FormRuntimeProvider>
    )
  }

  return (
    <FormRuntimeProvider value={{
      values,
      fieldValuesByBlockId,
      setValue,
      getGroupValues: (groupId) => values[resolveSubmitGroupId(groupId ?? blockId)] || {},
      getFieldValue: (fieldBlockId) => fieldValuesByBlockId[fieldBlockId],
      previewMode,
    }}>
      <div
        className="relative h-full w-full overflow-hidden"
        style={{
          backgroundColor,
          borderColor,
          borderWidth,
          borderStyle: Number(borderWidth) > 0 ? 'solid' : 'none',
          borderRadius: Math.max(0, Number(borderRadius) || 0),
          padding: Math.max(0, Number(contentPadding) || 0),
          boxSizing: 'border-box',
        }}
      >
        <div className="absolute inset-0">{children}</div>
        <div className="pointer-events-none relative z-10 flex h-full flex-col">
          <div className="pointer-events-none">
            {title ? <div className="text-base font-bold text-slate-950">{title}</div> : null}
            {description ? <div className="mt-1 text-xs font-medium leading-snug text-slate-500">{description}</div> : null}
          </div>
          <div className="mt-auto pt-2">
            <button
              type="button"
              className="pointer-events-auto w-full rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!canSubmit || status === 'submitting'}
              onClick={submit}
            >
              {status === 'submitting' ? 'Submitting...' : submitLabel || 'Submit'}
            </button>
            {status === 'success' ? <div className="mt-2 text-xs font-semibold text-emerald-700">{successMessage}</div> : null}
            {status === 'error' ? <div className="mt-2 text-xs font-semibold text-red-600">{errorMessage}</div> : null}
            {!canSubmit ? <div className="mt-2 text-xs text-slate-500">Save the project before testing submissions.</div> : null}
          </div>
        </div>
      </div>
    </FormRuntimeProvider>
  )
}
