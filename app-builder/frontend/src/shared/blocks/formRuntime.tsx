import { createContext, useContext } from 'react'

export type FormValue = string | boolean

export type FormRuntimeContextValue = {
  values: Record<string, Record<string, FormValue>>
  setValue: (fieldKey: string, value: FormValue, submitGroupId?: string) => void
  getGroupValues: (submitGroupId?: string) => Record<string, FormValue>
  previewMode?: boolean
}

const FormRuntimeContext = createContext<FormRuntimeContextValue | null>(null)

export const FormRuntimeProvider = FormRuntimeContext.Provider

export function useFormRuntime() {
  return useContext(FormRuntimeContext)
}

export function resolveFieldKey(blockId: string | undefined, label?: string, explicitKey?: string) {
  const raw = explicitKey?.trim() || label?.trim() || blockId || 'field'
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return slug || blockId || 'field'
}

export function resolveSubmitGroupId(submitGroupId?: string) {
  const raw = submitGroupId?.trim() || 'default'
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return slug || 'default'
}
