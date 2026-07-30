import { useEffect, useMemo, useState } from 'react'
import {
  listRuntimeCollectionRecords,
  subscribeToAppDataChanges,
  subscribeToAppUserSession,
} from '../../api'
import type { AppDataCollection, Block } from '../schema/types'
import { normalizeRepeaterProps } from '../schema/repeater'
import { mapCollectionRecordValuesByFieldId } from './runtimeRecordValues'
import type { RuntimeRecordContext } from './runtimeBindings'

export type RepeaterRecordsState =
  | { status: 'idle'; records: RuntimeRecordContext[] }
  | { status: 'loading'; records: RuntimeRecordContext[] }
  | { status: 'ready'; records: RuntimeRecordContext[] }
  | { status: 'empty'; records: RuntimeRecordContext[] }
  | { status: 'error'; records: RuntimeRecordContext[]; message: string }

type Options = {
  block: Block
  projectId?: string
  dataCollections: AppDataCollection[]
  enabled?: boolean
}

export function useRepeaterRecords({
  block,
  projectId,
  dataCollections,
  enabled = false,
}: Options): RepeaterRecordsState {
  const props = useMemo(() => normalizeRepeaterProps(block.props), [block.props])
  const collection = useMemo(
    () => dataCollections.find((candidate) => candidate.id === props.collectionId),
    [dataCollections, props.collectionId],
  )
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<RepeaterRecordsState>({ status: 'idle', records: [] })

  useEffect(() => {
    if (!projectId) return
    const refresh = () => setRevision((current) => current + 1)
    const unsubscribeData = subscribeToAppDataChanges(projectId, refresh)
    const unsubscribeSession = subscribeToAppUserSession(projectId, refresh)
    return () => {
      unsubscribeData()
      unsubscribeSession()
    }
  }, [projectId])

  useEffect(() => {
    if (!enabled) {
      setState({ status: 'idle', records: [] })
      return
    }
    if (!projectId) {
      setState({
        status: 'error',
        records: [],
        message: 'Save the project before previewing collection records.',
      })
      return
    }
    if (!collection) {
      setState({
        status: 'error',
        records: [],
        message: props.collectionId
          ? 'The configured collection no longer exists.'
          : 'Choose a collection in the inspector.',
      })
      return
    }

    let active = true
    setState({ status: 'loading', records: [] })
    void listRuntimeCollectionRecords(projectId, collection.id, {
      scope: props.scope,
      order: props.order,
      limit: props.limit,
    })
      .then((page) => {
        if (!active) return
        const records = page.records.map((record) => ({
          collectionId: collection.id,
          recordId: record.id,
          values: mapCollectionRecordValuesByFieldId(collection, record.data),
        }))
        setState(records.length
          ? { status: 'ready', records }
          : { status: 'empty', records: [] })
      })
      .catch((error: unknown) => {
        if (!active) return
        setState({
          status: 'error',
          records: [],
          message: error instanceof Error ? error.message : 'Could not load collection records.',
        })
      })

    return () => {
      active = false
    }
  }, [collection, enabled, projectId, props.limit, props.order, props.scope, props.collectionId, revision])

  return state
}
