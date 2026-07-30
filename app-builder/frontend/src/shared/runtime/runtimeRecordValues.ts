import type { AppDataCollection } from '../schema/types'

export function mapCollectionRecordValuesByFieldId(
  collection: AppDataCollection,
  data: Record<string, string | boolean | undefined>,
) {
  const values: Record<string, string> = {}

  for (const field of collection.fields) {
    const value = data[field.key]
    if (value === undefined) continue
    values[field.id] = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)
  }

  return values
}
