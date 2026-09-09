import { useEffect, useRef, useState } from 'react'
import { BLOCK_FONTS, normalizeBlockFont } from '../shared/schema/fonts'
import type { Block } from '../shared/schema/types'
import { changeBlockFont } from '../editor/changeBlockFont'

export function FontFamilyControl({ block, pageBlocks, onSave }: {
  block: Block
  pageBlocks: Block[]
  onSave?: (block: Block) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const latest = useRef(block)
  latest.current = block
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  return (
    <section className="editor-section">
      <label className="editor-section-title" htmlFor={`font-${block.id}`}>Font family</label>
      <select id={`font-${block.id}`} className="inspector-input mt-3" disabled={busy || !onSave}
        value={normalizeBlockFont(block.props.fontFamily)}
        onChange={async (event) => {
          setBusy(true)
          setError('')
          try {
            const next = await changeBlockFont(block, pageBlocks, normalizeBlockFont(event.target.value))
            if (mounted.current && latest.current === block) onSave?.(next)
          } catch (cause) {
            if (mounted.current) setError(cause instanceof Error ? cause.message : 'Could not change the font.')
          } finally {
            if (mounted.current) setBusy(false)
          }
        }}>
        {BLOCK_FONTS.map((font) => <option key={font.id} value={font.id}>{font.label}</option>)}
      </select>
      <p className="mt-2 text-xs text-slate-500">{busy ? 'Loading and checking text fit...' : 'Applies immediately. The box grows only if needed; font size stays the same.'}</p>
      {error ? <p role="alert" className="mt-2 text-sm text-red-700">{error}</p> : null}
    </section>
  )
}
