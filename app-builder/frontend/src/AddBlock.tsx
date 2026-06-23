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
    <div className="editor-rail-surface overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3.5 py-3 hover:bg-white/70"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-slate-900">{title}</span>
        <svg className={`h-4 w-4 text-slate-700 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {open ? <div className="border-t border-slate-200/60 p-2.5">{children}</div> : null}
    </div>
  )
}

const blockButton = 'editor-block-entry group'
const shapeOptions = [
  { value: 'rectangle', label: 'Rectangle', note: 'Sharp card or panel shape' },
  { value: 'circle', label: 'Circle', note: 'Avatar, badge, or dot shape' },
  { value: 'pill', label: 'Pill', note: 'Rounded banner or chip shape' },
] as const

type ShapeOption = (typeof shapeOptions)[number]['value']

function BlockEntry({ title, note, onClick }: { title: string; note: string; onClick: () => void }) {
  return (
    <button className={blockButton} onClick={onClick}>
      <span className="editor-block-entry-dot" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-slate-900">{title}</span>
        <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">{note}</span>
      </span>
    </button>
  )
}

function ShapeEntry({ onAdd }: { onAdd: (b: Block) => void }) {
  const [shapeType, setShapeType] = React.useState<ShapeOption>('rectangle')
  const selectedShape = shapeOptions.find((option) => option.value === shapeType) ?? shapeOptions[0]

  return (
    <div className="editor-shape-entry">
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
    <div className="grid gap-3">
      <CollapsibleSection title="Text & Navigation" defaultOpen>
        <div className="grid gap-2">
          <BlockEntry title="Hero" note="Intro headline" onClick={() => onAdd(createBlock('hero', { headline: 'New Hero' }))} />
          <BlockEntry title="Text" note="Paragraphs or short body copy" onClick={() => onAdd(createBlock('text', { value: 'New text' }))} />
          <BlockEntry title="Nav Button" note="Link to another page in the app" onClick={() => onAdd(createBlock('navButton', { label: 'Go', toPageId: '' }))} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Visual Elements" defaultOpen>
        <div className="grid gap-2">
          <BlockEntry title="Badge" note="Pill status or tag" onClick={() => onAdd(createBlock('badge'))} />
          <BlockEntry title="Icon" note="Simple symbol from a safe set" onClick={() => onAdd(createBlock('icon'))} />
          <ShapeEntry onAdd={onAdd} />
          <BlockEntry title="Progress Bar" note="Visual completion/status bar" onClick={() => onAdd(createBlock('progressBar'))} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Form Mockups">
        <div className="grid gap-2">
          <BlockEntry title="Input" note="Visual single-line field" onClick={() => onAdd(createBlock('input'))} />
          <BlockEntry title="Textarea" note="Visual multi-line field" onClick={() => onAdd(createBlock('textarea'))} />
          <BlockEntry title="Checkbox" note="Visual checked/unchecked option" onClick={() => onAdd(createBlock('checkbox'))} />
          <BlockEntry title="Toggle" note="Visual on/off switch" onClick={() => onAdd(createBlock('toggle'))} />
        </div>
      </CollapsibleSection>
    </div>
  )
}
