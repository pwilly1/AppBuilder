// © 2025 Preston Willis. All rights reserved.
import { useMemo, useState } from 'react'
import { PageRenderer } from '../PageRenderer'
import { AddBlock } from '../AddBlock'
import Inspector from '../components/Inspector'
import PagesPanel from '../components/PagesPanel'

type Props = {
  projectId?: string
  page: any
  pages?: Array<{ id: string; title?: string; path?: string; blocks?: any[] }>
  selectedPageId?: string
  addBlock: (b: any) => void
  setSelectedBlock: (b: any) => void
  editBlock: (b: any) => void
  updatePage: (page: any) => void
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
  const {
    projectId,
    page,
    pages = [],
    selectedPageId,
    addBlock,
    setSelectedBlock,
    editBlock,
    updatePage,
    deleteBlock,
    onReorder,
    selectedBlock,
    addPage,
    selectPage,
    renamePage,
    deletePage,
  } = props as any
  const [previewMode, setPreviewMode] = useState(false)

  const currentPageTitle = page?.title || 'Untitled Page'
  const blockCount = page?.blocks?.length ?? 0
  const pageCount = pages.length
  const selectedLabel = selectedBlock ? selectedBlock.type : 'Nothing selected'
  const modeLabel = previewMode ? 'Preview mode' : 'Edit mode'
  const pageIndex = Math.max(0, pages.findIndex((entry: any) => entry.id === selectedPageId)) + 1
  const pageSummary = useMemo(() => {
    if (!pageCount) return 'No pages yet'
    return `Page ${pageIndex} of ${pageCount}`
  }, [pageCount, pageIndex])

  return (
    <>
      <aside className="sidebar-hidden-mobile">
        <div className="editor-panel rounded-[1.9rem] p-4">
          <div className="editor-section">
            <div className="editor-section-title">Workspace</div>
            <div className="mt-2 text-lg font-semibold text-slate-900">Structure</div>
            <p className="editor-kicker mt-1">Organize pages first, then drop in blocks with a clear hierarchy.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="editor-pill">{pageCount} pages</span>
              <span className="editor-pill">{blockCount} blocks</span>
            </div>
          </div>

          <div className="mt-4">
            <PagesPanel
              pages={pages}
              selectedPageId={selectedPageId}
              onSelect={(id) => selectPage?.(id)}
              onAdd={() => addPage?.()}
              onRename={(id, title) => renamePage?.(id, title)}
              onDelete={(id) => deletePage?.(id)}
            />
          </div>

          <div className="mt-4 editor-section">
            <div className="flex items-center justify-between">
              <div>
                <div className="editor-section-title">Library</div>
                <h3 className="mt-1 text-sm font-semibold text-slate-900">Block palette</h3>
              </div>
              <span className="editor-kicker">Dragless add</span>
            </div>
            <p className="editor-kicker mt-2">Pick the right section type first. Keep each page focused and short.</p>
          </div>

          <div className="mt-4">
            <AddBlock onAdd={addBlock} />
          </div>
        </div>
      </aside>

      <section className="overflow-auto">
        <div className="editor-panel rounded-[2rem] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[rgba(53,80,128,0.12)] pb-4">
            <div>
              <div className="editor-section-title">Canvas</div>
              <h2 className="section-heading mt-1 text-3xl font-semibold text-slate-900">{currentPageTitle}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="editor-pill">{modeLabel}</span>
                <span className="editor-pill">{pageSummary}</span>
                <span className="editor-pill">{blockCount} blocks on page</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="editor-ghost-surface px-4 py-2 text-right">
                <div className="editor-section-title">Selection</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{selectedLabel}</div>
              </div>
              <button
                type="button"
                className="btn min-w-[120px]"
                onClick={() => {
                  const next = !previewMode
                  setPreviewMode(next)
                  if (next) setSelectedBlock(null)
                }}
              >
                {previewMode ? 'Back to Edit' : 'Open Preview'}
              </button>
            </div>
          </div>

          {page ? (
            <PageRenderer
              page={page}
              projectId={projectId}
              selectedBlockId={selectedBlock?.id}
              previewMode={previewMode}
              onNavigate={(targetPageId: string) => {
                if (!previewMode) return
                selectPage?.(targetPageId)
              }}
              onSelectBlock={(block: any) => setSelectedBlock(block)}
              onUpdateBlock={editBlock}
              onUpdatePage={updatePage}
              onReorder={(newBlocks: any[]) => onReorder(newBlocks)}
            />
          ) : (
            <div className="editor-stage mt-5 flex items-center justify-center p-8">
              <div className="max-w-md text-center">
                <div className="editor-section-title">No active page</div>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">Create a page to start building</h3>
                <p className="mt-2 text-sm text-slate-500">Use the left rail to add a page, then choose blocks for the first screen.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <aside>
        <div className="editor-panel rounded-[1.9rem] p-4">
          <div className="editor-section">
            <div className="editor-section-title">Inspector</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">Properties</div>
            <p className="editor-kicker mt-1">Edit content, navigation targets, and block-specific settings here.</p>
          </div>
          <div className="mt-4">
            <Inspector
              block={selectedBlock}
              pages={pages}
              onSave={(block: any) => {
                setSelectedBlock(block)
                editBlock(block)
              }}
              onClose={() => setSelectedBlock(null)}
              onDelete={(id: string) => {
                setSelectedBlock(null)
                deleteBlock(id)
              }}
            />
          </div>
        </div>
      </aside>
    </>
  )
}


