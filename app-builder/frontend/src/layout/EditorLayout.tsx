import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageRenderer } from '../editor/PageRenderer'
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
  deleteBlock: (id: string) => void
  onReorder: (blocks: any[]) => void
  selectedBlock: any
  saveProject: () => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  isSaving?: boolean
  lastSavedAt?: number | null
  saveError?: string | null
  addPage?: () => void
  selectPage?: (id: string) => void
  renamePage?: (id: string, title: string) => void
  deletePage?: (id: string) => void
  previewMode?: boolean
  onPreviewModeChange?: (previewMode: boolean) => void
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
    deleteBlock,
    onReorder,
    selectedBlock,
    saveProject,
    undo,
    redo,
    canUndo,
    canRedo,
    isSaving,
    lastSavedAt,
    saveError,
    addPage,
    selectPage,
    renamePage,
    deletePage,
    previewMode = false,
    onPreviewModeChange,
  } = props as any

  const navigate = useNavigate()
  const currentPageTitle = page?.title || 'Untitled Page'
  const blockCount = page?.blocks?.length ?? 0
  const pageCount = pages.length
  const modeLabel = previewMode ? 'Preview mode' : 'Edit mode'
  const pageIndex = Math.max(0, pages.findIndex((entry: any) => entry.id === selectedPageId)) + 1
  const [showAndroidPreviewNote, setShowAndroidPreviewNote] = useState(false)
  const pageSummary = useMemo(() => {
    if (!pageCount) return 'No pages yet'
    return `Page ${pageIndex} of ${pageCount}`
  }, [pageCount, pageIndex])

  return (
    <>
      <div className="col-span-full editor-panel rounded-[1.85rem] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 rounded-full border border-slate-200/70 bg-white/45 p-1">
            <button className="ghost-btn !px-3 !py-2 text-sm" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
            <button className="ghost-btn !px-3 !py-2 text-sm disabled:opacity-50" onClick={undo} disabled={!canUndo || previewMode}>
              Undo
            </button>
            <button className="ghost-btn !px-3 !py-2 text-sm disabled:opacity-50" onClick={redo} disabled={!canRedo || previewMode}>
              Redo
            </button>
            <button className="btn" onClick={saveProject} disabled={isSaving || previewMode}>
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-full border border-slate-200/70 bg-white/45 p-1">
            <div className="min-w-[150px] px-3 text-right text-xs text-slate-500">
              {isSaving ? 'Saving...' : lastSavedAt ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}` : 'Not saved yet'}
              {saveError ? ` | ${saveError}` : null}
            </div>
            <button
              type="button"
              className="btn min-w-[120px]"
              onClick={() => {
                const next = !previewMode
                onPreviewModeChange?.(next)
                if (next) setSelectedBlock(null)
              }}
            >
              {previewMode ? 'Back to Edit' : 'Open Preview'}
            </button>
            <button
              type="button"
              className="ghost-btn !px-4 !py-3 text-sm"
              onClick={() => setShowAndroidPreviewNote(true)}
            >
              Preview on Android
            </button>
          </div>
        </div>
      </div>

      <aside className="sidebar-hidden-mobile">
        <div className="editor-panel editor-side-panel editor-left-rail rounded-[2rem] p-4">
          <div className="editor-rail-header">
            <div>
              <div className="editor-section-title">Workspace</div>
              <div className="mt-1 text-base font-semibold text-slate-900">Build tools</div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <span className="editor-pill">{pageCount} pages</span>
              <span className="editor-pill">{blockCount} blocks</span>
            </div>
          </div>

          <div className="editor-side-panel-body mt-4 space-y-5">
            <PagesPanel
              pages={pages}
              selectedPageId={selectedPageId}
              onSelect={(id) => selectPage?.(id)}
              onAdd={() => addPage?.()}
              onRename={(id, title) => renamePage?.(id, title)}
              onDelete={(id) => deletePage?.(id)}
            />

            <div>
              <div className="editor-rail-section-heading">
                <div>
                  <div className="editor-section-title">Blocks</div>
                  <h3 className="mt-1 text-sm font-semibold text-slate-900">Add elements</h3>
                </div>
                <span className="editor-kicker">Click to add</span>
              </div>
              <AddBlock onAdd={addBlock} />
            </div>
          </div>
        </div>
      </aside>

      <section className="min-w-0 overflow-auto">
        <div className="editor-panel rounded-[2rem] p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-[1.35rem] border border-[rgba(53,80,128,0.10)] bg-[#fffcf6]/75 px-4 py-3 shadow-sm">
            <div>
              <div className="editor-section-title">Canvas</div>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">{currentPageTitle}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="editor-pill">{modeLabel}</span>
              <span className="editor-pill">{pageSummary}</span>
              <span className="editor-pill">{blockCount} blocks</span>
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
        <div className="editor-panel editor-side-panel rounded-[2rem] p-4">
          <div className="editor-section shrink-0">
            <div className="editor-section-title">Inspector</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">Properties</div>
            <p className="editor-kicker mt-1">Edit content, navigation targets, and block-specific settings here.</p>
          </div>
          <div className="editor-side-panel-body mt-4">
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

      {showAndroidPreviewNote ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[1.85rem] border border-slate-200 bg-[#fffcf6] p-6 shadow-2xl">
            <div className="editor-section-title">Android mobile preview</div>
            <h3 className="section-heading mt-2 text-2xl font-semibold text-slate-900">
              Public Android preview is not set up yet
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              The Kotlin Android runtime exists in the repository, but the mobile preview app is not currently
              distributed through an APK download or app store link.
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              For now, reviewers can test it by pulling the project code and running the native preview app from
              the Kotlin/Android source in Android Studio.
            </p>
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900">Local path</div>
              <code className="mt-2 block break-all text-xs text-slate-600">
                app-builder/native-preview/Android
              </code>
            </div>
            <div className="mt-6 flex justify-end">
              <button type="button" className="btn" onClick={() => setShowAndroidPreviewNote(false)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
