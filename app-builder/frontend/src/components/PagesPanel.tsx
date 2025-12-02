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
    <div className="card bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <strong className="text-sm text-slate-900">Pages</strong>
        <button className="text-sm px-2 py-1 rounded-md bg-slate-900 text-white hover:bg-slate-800" onClick={onAdd}>
          + Add Page
        </button>
      </div>
      <ul className="divide-y divide-slate-200">
        {pages.map((pg) => (
          <li key={pg.id} className={`flex items-center gap-2 py-2 ${pg.id === selectedPageId ? 'bg-slate-50 rounded-md px-2' : ''}`}>
            <button
              className="flex-1 text-left text-sm text-slate-900 hover:text-slate-700"
              onClick={() => onSelect(pg.id)}
            >
              {editingId === pg.id ? (
                <input
                  className="w-full border border-slate-300 rounded-md px-2 py-1 text-sm text-slate-900"
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
                className="text-xs text-slate-500 hover:text-slate-700"
                title="Rename"
                onClick={() => beginEdit(pg.id, pg.title)}
              >
                Rename
              </button>
              <button
                className="text-xs text-red-600 hover:text-red-700"
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
