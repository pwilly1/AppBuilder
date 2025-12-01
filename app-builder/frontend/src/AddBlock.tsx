import React from 'react'
import type { Block } from './shared/BlockTypes'

type SectionProps = {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function CollapsibleSection({ title, children, defaultOpen }: SectionProps) {
  const [open, setOpen] = React.useState(!!defaultOpen)
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-slate-900">{title}</span>
        <svg className={`h-4 w-4 text-slate-700 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {open ? (
        <div className="p-3 bg-white">
          {children}
        </div>
      ) : null}
    </div>
  )
}

export function AddBlock({ onAdd }: { onAdd: (b: Block)=>void }) {
  return (
    <div className="card bg-white border border-slate-200 rounded-xl p-4">
      <div className="space-y-3">
        <CollapsibleSection title="Blocks" defaultOpen>
          <div className="grid gap-2">
            <button className="btn bg-slate-900 text-white hover:bg-slate-800" onClick={()=>onAdd({ id: crypto.randomUUID(), type:'hero', props:{ headline:'New Hero', subhead:'' } as any })}>
              Hero
            </button>
            <button className="btn bg-slate-900 text-white hover:bg-slate-800" onClick={()=>onAdd({ id: crypto.randomUUID(), type:'text', props:{ value:'New text' } as any })}>
              Text
            </button>
          </div>
        </CollapsibleSection>
        {/* Future folders */}
        {/* <CollapsibleSection title="Layouts">
          <div className="grid gap-2">
            <button className="btn bg-slate-900 text-white hover:bg-slate-800">Two Column</button>
          </div>
        </CollapsibleSection> */}
      </div>
    </div>
  )
}
