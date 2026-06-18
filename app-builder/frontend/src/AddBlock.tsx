// Copyright 2025 Preston Willis. All rights reserved.
import React from 'react'
import type { Block } from './shared/schema/types'
import { createBlock } from './shared/schema/registry'

type SectionProps = {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function CollapsibleSection({ title, children, defaultOpen }: SectionProps) {
  const [open, setOpen] = React.useState(!!defaultOpen)
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 hover:bg-slate-50/80"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-slate-900">{title}</span>
        <svg className={`h-4 w-4 text-slate-700 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {open ? <div className="bg-white/70 p-3">{children}</div> : null}
    </div>
  )
}

const blockButton = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50'
const shapeOptions = [
  { value: 'rectangle', label: 'Rectangle', note: 'Sharp card or panel shape' },
  { value: 'circle', label: 'Circle', note: 'Avatar, badge, or dot shape' },
  { value: 'pill', label: 'Pill', note: 'Rounded banner or chip shape' },
] as const

type ShapeOption = (typeof shapeOptions)[number]['value']

function BlockEntry({ title, note, onClick }: { title: string; note: string; onClick: () => void }) {
  return (
    <button className={blockButton} onClick={onClick}>
      <div>{title}</div>
      <div className="mt-1 text-xs font-medium text-slate-500">{note}</div>
    </button>
  )
}

function ShapeEntry({ onAdd }: { onAdd: (b: Block) => void }) {
  const [shapeType, setShapeType] = React.useState<ShapeOption>('rectangle')
  const selectedShape = shapeOptions.find((option) => option.value === shapeType) ?? shapeOptions[0]

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">Shape</div>
          <div className="mt-1 text-xs font-medium text-slate-500">{selectedShape.note}</div>
        </div>
        <div
          className="mt-0.5 h-8 w-8 shrink-0 border border-slate-300 bg-blue-100"
          style={{ borderRadius: shapeType === 'rectangle' ? 8 : 999 }}
          aria-hidden="true"
        />
      </div>

      <div className="mt-3 grid gap-2">
        <label className="sr-only" htmlFor="shape-type-picker">Shape type</label>
        <select
          id="shape-type-picker"
          className="inspector-input py-2 text-xs"
          value={shapeType}
          onChange={(event) => setShapeType(event.target.value as ShapeOption)}
        >
          {shapeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-sm w-full"
          onClick={() => onAdd(createBlock('shape', { shapeType }))}
        >
          Add {selectedShape.label}
        </button>
      </div>
    </div>
  )
}

export function AddBlock({ onAdd }: { onAdd: (b: Block) => void }) {
  return (
    <div className="card">
      <div className="space-y-3">
        <CollapsibleSection title="Core Content" defaultOpen>
          <div className="grid gap-2">
            <BlockEntry title="Hero" note="Intro headline" onClick={() => onAdd(createBlock('hero', { headline: 'New Hero' }))} />
            <BlockEntry title="Text" note="Paragraphs or short body copy" onClick={() => onAdd(createBlock('text', { value: 'New text' }))} />
            <BlockEntry title="Nav Button" note="Link to another page in the app" onClick={() => onAdd(createBlock('navButton', { label: 'Go', toPageId: '' }))} />
            <ShapeEntry onAdd={onAdd} />
            <BlockEntry title="Divider" note="Horizontal or vertical separator" onClick={() => onAdd(createBlock('divider'))} />
            <BlockEntry title="Spacer" note="Empty layout space" onClick={() => onAdd(createBlock('spacer'))} />
            <BlockEntry title="Input" note="Visual single-line field" onClick={() => onAdd(createBlock('input'))} />
            <BlockEntry title="Textarea" note="Visual multi-line field" onClick={() => onAdd(createBlock('textarea'))} />
          </div>
        </CollapsibleSection>
      </div>
    </div>
  )
}
