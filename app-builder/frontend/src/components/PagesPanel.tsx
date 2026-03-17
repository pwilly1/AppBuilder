// © 2025 Preston Willis. All rights reserved.
import { useState } from 'react'

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

  function beginEdit(id: string, current: string | undefined) {
    setEditingId(id)
    setTempTitle(current || '')
  }

  function commitEdit(id: string) {
    const t = tempTitle.trim()
    if (t) onRename(id, t)
    setEditingId(null)
    setTempTitle('')
  }

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Structure</div>
          <strong className="mt-1 block text-sm text-slate-900">Pages</strong>
        </div>
        <button className="btn-sm" onClick={onAdd}>
          + Add Page
        </button>
      </div>
      <ul className="space-y-2">
        {pages.map((pg) => (
          <li
            key={pg.id}
            className={`flex items-center gap-2 rounded-2xl border px-3 py-3 transition-colors ${
              pg.id === selectedPageId
                ? 'border-[rgba(37,99,235,0.35)] bg-[rgba(37,99,235,0.08)]'
                : 'border-slate-200/70 bg-white/70'
            }`}
          >
            <button
              className="flex-1 text-left text-sm font-medium text-slate-900 hover:text-slate-700"
              onClick={() => onSelect(pg.id)}
            >
              {editingId === pg.id ? (
                <input
                  className="field-input !rounded-xl !px-3 !py-2"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onBlur={() => commitEdit(pg.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit(pg.id)
                    if (e.key === 'Escape') { setEditingId(null); setTempTitle('') }
                  }}
                  autoFocus
                />
              ) : (
                <span onDoubleClick={() => beginEdit(pg.id, pg.title)}>{pg.title || 'Untitled'}</span>
              )}
            </button>
            <div className="flex items-center gap-2">
              <button
                className="text-xs font-medium text-slate-500 hover:text-slate-700"
                title="Rename"
                onClick={() => beginEdit(pg.id, pg.title)}
              >
                Rename
              </button>
              <button
                className="text-xs font-medium text-red-600 hover:text-red-700"
                title="Delete"
                onClick={() => {
                  const ok = confirm('Delete this page?')
                  if (!ok) return
                  onDelete(pg.id)
                }}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

