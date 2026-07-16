import { createContext, useContext } from 'react'
import type { SubmitDataFieldRef } from '../schema/types'

export type FormValue = string | boolean

export type FormRuntimeContextValue = {
  fieldValuesByBlockId: Record<string, FormValue>
  fieldKeysByBlockId: Record<string, string>
  setValue: (fieldKey: string, value: FormValue, fieldBlockId?: string) => void
  getFieldValue: (fieldBlockId: string) => FormValue | undefined
  getFieldValues: (fields: SubmitDataFieldRef[]) => Record<string, FormValue>
  getAllValues: () => Record<string, FormValue>
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

export function collectFieldValues(
  fields: SubmitDataFieldRef[],
  valuesByBlockId: Record<string, FormValue>,
) {
  return fields.reduce<Record<string, FormValue>>((values, field) => {
    const value = valuesByBlockId[field.fieldBlockId]
    if (value !== undefined) values[field.targetFieldKey || field.fieldBlockId] = value
    return values
  }, {})
}

export function collectAllFieldValues(
  valuesByBlockId: Record<string, FormValue>,
  fieldKeysByBlockId: Record<string, string>,
) {
  return Object.entries(valuesByBlockId).reduce<Record<string, FormValue>>((values, [blockId, value]) => {
    values[fieldKeysByBlockId[blockId] || blockId] = value
    return values
  }, {})
}
