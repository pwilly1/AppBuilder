// © 2025 Preston Willis. All rights reserved.
// jsx runtime handles React import
import { PageRenderer } from '../PageRenderer'
import { AddBlock } from '../AddBlock'
import Inspector from '../components/Inspector'
import PagesPanel from '../components/PagesPanel'
import { useState } from 'react'

type Props = {
  page: any
  pages?: Array<{ id: string; title?: string; path?: string }>
  selectedPageId?: string
  addBlock: (b: any) => void
  setSelectedBlock: (b: any) => void
  editBlock: (b: any) => void
  deleteBlock: (id: string) => void
  onReorder: (blocks: any[]) => void
  selectedBlock: any
  saveProject: () => void
  addPage?: () => void
  selectPage?: (id: string) => void
  renamePage?: (id: string, title: string) => void
  deletePage?: (id: string) => void
}

export default function EditorLayout(props: Props) {
  const { page, pages = [], selectedPageId, addBlock, setSelectedBlock, editBlock, deleteBlock, onReorder, selectedBlock, addPage, selectPage, renamePage, deletePage } = props as any
  const [previewMode, setPreviewMode] = useState(false)

  return (
    <>
      {/* Restore original structure/classes so existing CSS/layout rules still apply */}
      <aside className="sidebar-hidden-mobile">
        <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 shadow-sm p-4">
          <div className="mb-4">
            <PagesPanel
              pages={pages}
              selectedPageId={selectedPageId}
              onSelect={(id) => selectPage?.(id)}
              onAdd={() => addPage?.()}
              onRename={(id, t) => renamePage?.(id, t)}
              onDelete={(id) => deletePage?.(id)}
            />
          </div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white/90">Blocks</h3>
          </div>
          <AddBlock onAdd={addBlock} />
        </div>
      </aside>

      <section className="overflow-auto">
        <div className="rounded-3xl bg-gradient-to-br from-slate-900/60 via-slate-800/50 to-slate-700/40 border border-white/10 shadow-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-white/70">{previewMode ? 'Preview mode' : 'Edit mode'}</div>
            <button
              type="button"
              className="btn"
              onClick={() => {
                const next = !previewMode
                setPreviewMode(next)
                if (next) setSelectedBlock(null)
              }}
            >
              {previewMode ? 'Edit' : 'Preview'}
            </button>
          </div>
          {page ? (
            <PageRenderer
              page={page}
              previewMode={previewMode}
              onNavigate={(targetPageId: string) => {
                if (!previewMode) return
                selectPage?.(targetPageId)
              }}
              onSelectBlock={(b: any) => setSelectedBlock(b)}
              onUpdateBlock={editBlock}
              onReorder={(newBlocks: any[]) => onReorder(newBlocks)}
            />
          ) : (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-white/90">No page selected</h3>
              <p className="text-sm text-white/60">Create a page or open a project with pages to start editing.</p>
            </div>
          )}
        </div>
      </section>

      <aside>
        <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 shadow-sm p-4">
          <Inspector
            block={selectedBlock}
            pages={pages}
            onSave={(b: any) => {
              setSelectedBlock(null)
              editBlock(b)
            }}
            onClose={() => setSelectedBlock(null)}
            onDelete={(id: string) => {
              setSelectedBlock(null)
              deleteBlock(id)
            }}
          />
        </div>
      </aside>
    </>
  )
}
