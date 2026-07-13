import React from 'react'
import { listPublicCollectionRecords, type ProjectAppDataRecord } from '../../api'

type Props = {
  collectionId?: string
  title?: string
  emptyMessage?: string
  displayFieldKeys?: string
  backgroundColor?: string
  textColor?: string
  borderColor?: string
  borderRadius?: number
  projectId?: string
  previewMode?: boolean
}

export function DataListBlock({
  collectionId = '',
  title = 'Records',
  emptyMessage = 'No records yet.',
  displayFieldKeys = '',
  backgroundColor = '#ffffff',
  textColor = '#0f172a',
  borderColor = '#dbe3ef',
  borderRadius = 14,
  projectId,
  previewMode,
}: Props) {
  const [records, setRecords] = React.useState<ProjectAppDataRecord[]>([])
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    if (!previewMode || !projectId || !collectionId) {
      setRecords([])
      setStatus('idle')
      setError('')
      return
    }

    let active = true
    setStatus('loading')
    listPublicCollectionRecords(projectId, collectionId)
      .then((nextRecords) => {
        if (!active) return
        setRecords(nextRecords)
        setStatus('ready')
      })
      .catch((reason: unknown) => {
        if (!active) return
        setError(reason instanceof Error ? reason.message : 'Could not load records.')
        setStatus('error')
      })
    return () => { active = false }
  }, [collectionId, previewMode, projectId])

  const configuredKeys = displayFieldKeys
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean)

  return (
    <section
      style={{
        width: '100%',
        height: '100%',
        overflow: 'auto',
        boxSizing: 'border-box',
        padding: 12,
        backgroundColor,
        color: textColor,
        border: `1px solid ${borderColor}`,
        borderRadius,
      }}
    >
      <h3 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 700 }}>{title}</h3>
      {!collectionId ? <p style={messageStyle}>Choose a collection in the inspector.</p> : null}
      {collectionId && !previewMode ? <p style={messageStyle}>Collection records appear in preview mode.</p> : null}
      {status === 'loading' ? <p style={messageStyle}>Loading records...</p> : null}
      {status === 'error' ? <p style={{ ...messageStyle, color: '#b91c1c' }}>{error}</p> : null}
      {status === 'ready' && !records.length ? <p style={messageStyle}>{emptyMessage}</p> : null}
      {status === 'ready' && records.length ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {records.map((record) => {
            const keys = configuredKeys.length ? configuredKeys : Object.keys(record.data || {})
            return (
              <article key={record.id} style={{ border: `1px solid ${borderColor}`, borderRadius: 10, padding: 10 }}>
                {keys.map((key) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
                    <strong>{formatLabel(key)}</strong>
                    <span style={{ textAlign: 'right', overflowWrap: 'anywhere' }}>{formatValue(record.data?.[key])}</span>
                  </div>
                ))}
              </article>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}

const messageStyle: React.CSSProperties = { margin: 0, fontSize: 13, color: '#64748b' }

function formatLabel(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatValue(value: string | boolean | undefined) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return value || '-'
}
