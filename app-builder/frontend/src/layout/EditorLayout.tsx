// © 2025 Preston Willis. All rights reserved.
import { PageRenderer } from '../PageRenderer'
import { AddBlock } from '../AddBlock'
import Inspector from '../components/Inspector'
import PagesPanel from '../components/PagesPanel'
import { useState } from 'react'

type Props = {
  projectId?: string
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
  const { projectId, page, pages = [], selectedPageId, addBlock, setSelectedBlock, editBlock, deleteBlock, onReorder, selectedBlock, addPage, selectPage, renamePage, deletePage } = props as any
  const [previewMode, setPreviewMode] = useState(false)

  return (
    <>
      <aside className="sidebar-hidden-mobile">
        <div className="shell-panel rounded-[1.75rem] p-4">
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
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Library</div>
              <h3 className="text-sm font-semibold text-slate-900">Blocks</h3>
            </div>
          </div>
          <AddBlock onAdd={addBlock} />
        </div>
      </aside>

      <section className="overflow-auto">
        <div className="shell-panel rounded-[2rem] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Canvas</div>
              <div className="text-sm font-semibold text-slate-900">{previewMode ? 'Preview mode' : 'Edit mode'}</div>
            </div>
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
              projectId={projectId}
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
            <div className="py-12 text-center">
              <h3 className="text-lg font-medium text-slate-900">No page selected</h3>
              <p className="text-sm text-slate-500">Create a page or open a project with pages to start editing.</p>
            </div>
          )}
        </div>
      </section>

      <aside>
        <div className="shell-panel rounded-[1.75rem] p-4">
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
