// © 2025 Preston Willis. All rights reserved.
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

const blockButton = 'btn-sm !justify-start !rounded-2xl !bg-white !px-4 !py-3 !text-slate-900 ring-1 ring-slate-200 hover:!bg-slate-50'

export function AddBlock({ onAdd }: { onAdd: (b: Block)=>void }) {
  return (
    <div className="card">
      <div className="space-y-3">
        <CollapsibleSection title="Blocks" defaultOpen>
          <div className="grid gap-2">
            <button className={blockButton} onClick={()=>onAdd(createBlock('hero', { headline:'New Hero', subhead:'' }))}>
              Hero
            </button>
            <button className={blockButton} onClick={()=>onAdd(createBlock('text', { value:'New text' }))}>
              Text
            </button>
            <button className={blockButton} onClick={()=>onAdd(createBlock('navButton', { label:'Go', toPageId:'' }))}>
              Nav Button
            </button>
            <button className={blockButton} onClick={()=>onAdd(createBlock('servicesList'))}>
              Services List
            </button>
            <button className={blockButton} onClick={()=>onAdd(createBlock('contactForm'))}>
              Contact Form
            </button>
            <button className={blockButton} onClick={()=>onAdd(createBlock('imageGallery'))}>
              Image Gallery
            </button>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  )
}
