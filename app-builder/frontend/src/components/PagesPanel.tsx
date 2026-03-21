// © 2025 Preston Willis. All rights reserved.
import { useMemo, useState } from 'react'

export type PageLite = { id: string; title?: string; path?: string }

type Props = {
  pages: PageLite[]
  selectedPageId: string
  onSelect: (id: string) => void
  onAdd: () => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
}

export default function PagesPanel({ pages, selectedPageId, onSelect, onAdd, onRename, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [tempTitle, setTempTitle] = useState<string>('')

  const selectedPage = useMemo(() => pages.find((page) => page.id === selectedPageId), [pages, selectedPageId])

  function beginEdit(id: string, current: string | undefined) {
    setEditingId(id)
    setTempTitle(current || '')
  }

  function commitEdit(id: string) {
    const next = tempTitle.trim()
    if (next) onRename(id, next)
    setEditingId(null)
    setTempTitle('')
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="editor-section-title">Pages</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">Page map</div>
        </div>
        <button className="btn-sm min-w-[96px]" onClick={onAdd}>+ Add Page</button>
      </div>

      <div className="editor-ghost-surface mt-3 px-4 py-3">
        <div className="editor-kicker">Current page</div>
        <div className="mt-1 text-sm font-semibold text-slate-900">{selectedPage?.title || 'Nothing selected'}</div>
        <div className="mt-1 text-xs text-slate-500">{selectedPage?.path || 'No route path set yet'}</div>
      </div>

      <ul className="mt-4 space-y-2">
        {pages.map((page, index) => {
          const active = page.id === selectedPageId
          return (
            <li
              key={page.id}
              className={`rounded-2xl border px-3 py-3 transition-colors ${
                active
                  ? 'border-[rgba(37,99,235,0.35)] bg-[rgba(37,99,235,0.08)]'
                  : 'border-slate-200/70 bg-white/70'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                    active ? 'bg-[rgba(37,99,235,0.16)] text-[var(--accent-deep)]' : 'bg-slate-100 text-slate-500'
                  }`}
                  onClick={() => onSelect(page.id)}
                >
                  {index + 1}
                </button>

                <div className="min-w-0 flex-1">
                  {editingId === page.id ? (
                    <input
                      className="inspector-input"
                      value={tempTitle}
                      onChange={(e) => setTempTitle(e.target.value)}
                      onBlur={() => commitEdit(page.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEdit(page.id)
                        if (e.key === 'Escape') {
                          setEditingId(null)
                          setTempTitle('')
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    <>
                      <button type="button" className="block text-left text-sm font-semibold text-slate-900" onClick={() => onSelect(page.id)}>
                        {page.title || 'Untitled'}
                      </button>
                      <div className="mt-1 text-xs text-slate-500">{page.path || '/untitled'}</div>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-end gap-3 text-xs font-medium">
                <button className="text-slate-500 hover:text-slate-700" type="button" onClick={() => beginEdit(page.id, page.title)}>
                  Rename
                </button>
                <button
                  className="text-red-600 hover:text-red-700"
                  type="button"
                  onClick={() => {
                    const ok = confirm('Delete this page?')
                    if (!ok) return
                    onDelete(page.id)
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
