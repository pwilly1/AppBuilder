import { useEffect, useRef, useState } from 'react'
import type { Block } from '../shared/schema/types'
import { appearanceColor, appearanceNumber, type BlockAppearanceProps } from '../shared/schema/blockAppearance'
import { changeBlockPresentation } from '../editor/changeBlockFont'

export function BlockAppearanceControl({ block: selected, pageBlocks, onSave }: {
  block: Block; pageBlocks: Block[]; onSave?: (block: Block) => void
}) {
  const block = pageBlocks.find(item => item.id === selected.id) ?? selected
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const latest = useRef(block)
  latest.current = block
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  async function apply(changes: BlockAppearanceProps) {
    setBusy(true)
    setError('')
    try {
      const next = await changeBlockPresentation(block, pageBlocks, changes)
      if (mounted.current && latest.current === block) onSave?.(next)
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'Could not change appearance.')
    } finally {
      if (mounted.current) setBusy(false)
    }
  }
  const enabled = block.type !== 'text' || block.props.textSurfaceEnabled === true
  const background = appearanceColor(block.props.backgroundColor, block.type === 'button' ? '#2563eb' : block.type === 'text' ? '#ffffff' : 'transparent')
  const border = appearanceColor(block.props.borderColor, '#cbd5e1')
  const numbers = [
    ['borderWidth', 'Border width (px)', block.type === 'text' ? 1 : 0, 12],
    ['borderRadius', 'Corner radius (px)', block.type === 'button' ? 10 : block.type === 'text' ? 12 : 0, 999],
    ['contentPadding', block.type === 'button' ? 'Outer padding (px)' : 'Content padding (px)', block.type === 'hero' ? 16 : 12, 96],
  ] as const
  return <section className="editor-section">
    <div className="editor-section-title">Appearance</div>
    <fieldset disabled={busy || !onSave} className="mt-3 grid gap-3">
      {block.type === 'text' && <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={event => void apply({ textSurfaceEnabled: event.target.checked })} />
        Enable text background and border
      </label>}
      {enabled && <>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={background === 'transparent'} onChange={event => void apply({ backgroundColor: event.target.checked ? 'transparent' : '#ffffff' })} />Transparent background
        </label>
        {background !== 'transparent' && <label className="grid gap-1 text-sm">Background color
          <input type="color" className="inspector-input h-10" value={background} onChange={event => void apply({ backgroundColor: event.target.value })} />
        </label>}
        <label className="grid gap-1 text-sm">Border color
          <input type="color" className="inspector-input h-10" value={border === 'transparent' ? '#cbd5e1' : border} onChange={event => void apply({ borderColor: event.target.value })} />
        </label>
      </>}
      {numbers.filter(([key]) => enabled || key === 'contentPadding').map(([key, label, fallback, max]) => {
        const value = appearanceNumber(block.props[key], fallback, max)
        return <label key={key} className="grid gap-1 text-sm">{label}
          <input key={`${value}-${busy}`} type="number" min={0} max={max} step={1} className="inspector-input"
            defaultValue={value} onBlur={event => {
              const raw = event.target.valueAsNumber
              if (!Number.isFinite(raw)) { event.target.value = String(value); return }
              const next = appearanceNumber(raw, fallback, max)
              event.target.value = String(next)
              if (next !== value) void apply({ [key]: next })
            }} />
        </label>
      })}
    </fieldset>
    <p className="mt-2 text-xs text-slate-500">Numbers apply when you leave the field. The box grows only if the content needs more room and space is available.</p>
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
  </section>
}
