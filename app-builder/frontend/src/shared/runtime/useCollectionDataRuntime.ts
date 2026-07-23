import { useEffect, useState } from 'react'
import { getLatestPublicCollectionRecord, getPublicCollectionRecord } from '../../api'
import type { AppDataCollection, Page } from '../schema/types'
import { collectBoundCollectionRequests, type RuntimeDataState } from './runtimeBindings'

type Options = {
  page: Pick<Page, 'id' | 'blocks'>
  projectId?: string
  dataCollections: AppDataCollection[]
  enabled?: boolean
}

export function useCollectionDataRuntime({
  page,
  projectId,
  dataCollections,
  enabled = false,
}: Options): Record<string, RuntimeDataState> {
  const [collectionData, setCollectionData] = useState<Record<string, RuntimeDataState>>({})

  useEffect(() => {
    const requests = collectBoundCollectionRequests(page)
    if (!enabled || requests.length === 0) {
      setCollectionData({})
      return
    }

    let active = true
    const collectionsById = new Map(dataCollections.map((collection) => [collection.id, collection]))
    setCollectionData(Object.fromEntries(requests.map((request) => [request.key, { status: 'loading' }])))

    void Promise.all(requests.map(async (request) => {
      const collection = collectionsById.get(request.collectionId)
      if (!collection) {
        return [request.key, {
          status: 'error',
          message: 'The configured collection no longer exists.',
        } as RuntimeDataState] as const
      }
      if (!projectId) {
        return [request.key, {
          status: 'error',
          message: 'Save the project before previewing collection data.',
        } as RuntimeDataState] as const
      }

      try {
        const record = request.record.mode === 'specific'
          ? await getPublicCollectionRecord(projectId, request.collectionId, request.record.recordId)
          : await getLatestPublicCollectionRecord(projectId, request.collectionId)
        if (!record) return [request.key, { status: 'empty' } as RuntimeDataState] as const
        return [request.key, {
          status: 'ready',
          recordId: record.id,
          values: mapRecordValuesByFieldId(collection, record.data),
        } as RuntimeDataState] as const
      } catch (error: unknown) {
        return [request.key, {
          status: 'error',
          message: error instanceof Error ? error.message : 'Could not load collection data.',
        } as RuntimeDataState] as const
      }
    })).then((entries) => {
      if (active) setCollectionData(Object.fromEntries(entries))
    })

    return () => { active = false }
  }, [dataCollections, enabled, page, projectId])

  return collectionData
}

function mapRecordValuesByFieldId(
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
