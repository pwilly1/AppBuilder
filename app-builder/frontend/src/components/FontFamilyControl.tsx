import { useEffect, useRef, useState } from 'react'
import { BLOCK_FONTS, normalizeBlockFont, normalizeTypography, defaultTextWeight, defaultLineHeight, type BlockTypographyProps } from '../shared/schema/fonts'
import type { Block } from '../shared/schema/types'
import { changeBlockTypography } from '../editor/changeBlockFont'

export function FontFamilyControl({ block: selectedBlock, pageBlocks, onSave }: {
  block: Block
  pageBlocks: Block[]
  onSave?: (block: Block) => void
}) {
  const block = pageBlocks.find((candidate) => candidate.id === selectedBlock.id) ?? selectedBlock
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const latest = useRef(block)
  latest.current = block
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const style = normalizeTypography(block.props)

  async function apply(changes: BlockTypographyProps) {
    setBusy(true)
    setError('')
    try {
      const next = await changeBlockTypography(block, pageBlocks, changes)
      if (mounted.current && latest.current === block) onSave?.(next)
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'Could not change text styling.')
    } finally {
      if (mounted.current) setBusy(false)
    }
  }

  return (
    <section className="editor-section">
      <div className="editor-section-title">Typography</div>
      <fieldset disabled={busy || !onSave} className="mt-3 grid gap-3">
        <label className="grid gap-1 text-sm">
          Font family
          <select className="inspector-input" value={normalizeBlockFont(block.props.fontFamily)}
            onChange={(event) => void apply({ fontFamily: normalizeBlockFont(event.target.value) })}>
            {BLOCK_FONTS.map((font) => <option key={font.id} value={font.id}>{font.label}</option>)}
          </select>
        </label>
        <div className="typography-formatting flex flex-wrap gap-2" role="group" aria-label="Text formatting">
          <button type="button" className="ghost-btn !px-3 !py-2" aria-pressed={(style.fontWeight ?? defaultTextWeight(block.type)) === 700}
            onClick={() => void apply({ fontWeight: (style.fontWeight ?? defaultTextWeight(block.type)) === 700 ? 400 : 700 })}>Bold</button>
          <button type="button" className="ghost-btn !px-3 !py-2" aria-pressed={style.fontStyle === 'italic'}
            onClick={() => void apply({ fontStyle: style.fontStyle === 'italic' ? 'normal' : 'italic' })}>Italic</button>
          <button type="button" className="ghost-btn !px-3 !py-2" aria-pressed={style.textDecoration === 'underline'}
            onClick={() => void apply({ textDecoration: style.textDecoration === 'underline' ? 'none' : 'underline' })}>Underline</button>
        </div>
        <label className="grid gap-1 text-sm">
          Text alignment
          <select className="inspector-input" value={style.textAlign ?? 'left'}
            onChange={(event) => void apply({ textAlign: event.target.value as BlockTypographyProps['textAlign'] })}>
            <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Line spacing (multiplier)
          <input key={`line-${style.lineHeight}-${busy}`} className="inspector-input" type="number" min="1" max="3" step="0.05"
            defaultValue={style.lineHeight ?? defaultLineHeight(block.type)}
            onBlur={(event) => {
              const value = event.target.valueAsNumber
              if (Number.isFinite(value) && value !== (style.lineHeight ?? defaultLineHeight(block.type))) void apply({ lineHeight: value })
            }} />
        </label>
        <label className="grid gap-1 text-sm">
          Letter spacing (px)
          <input key={`letters-${style.letterSpacing}-${busy}`} className="inspector-input" type="number" min="-2" max="10" step="0.1"
            defaultValue={style.letterSpacing ?? 0}
            onBlur={(event) => {
              const value = event.target.valueAsNumber
              if (Number.isFinite(value) && value !== (style.letterSpacing ?? 0)) void apply({ letterSpacing: value })
            }} />
        </label>
      </fieldset>
      <p className="mt-2 text-xs text-slate-500">{busy ? 'Checking text fit...' : 'Applies immediately. Spacing applies when you leave the field. Alignment affects text, not the block position.'}</p>
      {error ? <p role="alert" className="mt-2 text-sm text-red-700">{error}</p> : null}
    </section>
  )
}
