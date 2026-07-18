// Copyright 2025 Preston Willis. All rights reserved.
import { useMemo, useState } from 'react'
import { DEFAULT_PAGE_BACKGROUND_COLOR, normalizePageBackgroundColor } from '../shared/schema/pageAppearance'
import type { PageAppearance } from '../shared/schema/types'

export type PageLite = { id: string; title?: string; path?: string; appearance?: PageAppearance }

type Props = {
  pages: PageLite[]
  selectedPageId: string
  onSelect: (id: string) => void
  onAdd: () => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  onBackgroundColorChange: (id: string, color: string) => void
}

const PAGE_COLOR_PRESETS = [
  { name: 'White', color: '#ffffff' },
  { name: 'Gray', color: '#f3f4f6' },
  { name: 'Red', color: '#fee2e2' },
  { name: 'Yellow', color: '#fef3c7' },
  { name: 'Green', color: '#dcfce7' },
  { name: 'Blue', color: '#dbeafe' },
]

export default function PagesPanel({
  pages,
  selectedPageId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
  onBackgroundColorChange,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [tempTitle, setTempTitle] = useState<string>('')

  const selectedPage = useMemo(() => pages.find((page) => page.id === selectedPageId), [pages, selectedPageId])
  const selectedBackgroundColor = normalizePageBackgroundColor(selectedPage?.appearance?.backgroundColor)

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
    <div>
      <div className="editor-rail-section-heading">
        <div>
          <div className="editor-section-title">Pages</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">Page map</div>
        </div>
        <button className="btn-sm min-w-[96px]" onClick={onAdd}>+ Add Page</button>
      </div>

      <div className="editor-rail-surface mt-3 px-3 py-3">
        <div className="editor-kicker">Current page</div>
        <div className="mt-1 text-sm font-semibold text-slate-900">{selectedPage?.title || 'Nothing selected'}</div>
        <div className="mt-1 text-xs text-slate-500">{selectedPage?.path || 'No route path set yet'}</div>
      </div>

      {selectedPage ? (
        <div className="editor-rail-surface mt-3 px-3 py-3">
          <div className="editor-kicker">Page appearance</div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <label className="text-xs font-semibold text-slate-600" htmlFor="page-background-color">
              Background color
            </label>
            <input
              id="page-background-color"
              type="color"
              className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
              value={selectedBackgroundColor}
              onChange={(event) => onBackgroundColorChange(selectedPage.id, event.currentTarget.value)}
              aria-label="Page background color"
            />
          </div>
          <div className="mt-3 grid grid-cols-6 gap-2" aria-label="Page background color presets">
            {PAGE_COLOR_PRESETS.map(({ name, color }) => (
              <button
                key={color}
                type="button"
                className={`h-7 rounded-lg border ${selectedBackgroundColor === color ? 'border-blue-600 ring-2 ring-blue-100' : 'border-slate-200'}`}
                style={{ backgroundColor: color }}
                onClick={() => onBackgroundColorChange(selectedPage.id, color)}
                aria-label={`Set page background to ${name}`}
                title={`${name} (${color})`}
              />
            ))}
          </div>
          {selectedBackgroundColor !== DEFAULT_PAGE_BACKGROUND_COLOR ? (
            <button
              type="button"
              className="mt-3 text-xs font-semibold text-blue-700 hover:text-blue-800"
              onClick={() => onBackgroundColorChange(selectedPage.id, DEFAULT_PAGE_BACKGROUND_COLOR)}
            >
              Reset to white
            </button>
          ) : null}
        </div>
      ) : null}

      <ul className="mt-4 space-y-2">
        {pages.map((page, index) => {
          const active = page.id === selectedPageId
          return (
            <li
              key={page.id}
              className={`editor-page-row ${
                active
                  ? 'editor-page-row-active'
                  : ''
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
