import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageRenderer } from '../editor/PageRenderer'
import { AddBlock } from '../AddBlock'
import Inspector from '../components/Inspector'
import PagesPanel from '../components/PagesPanel'
import type { Block, Page, Project } from '../shared/schema/types'
import type { TemplateDefinition } from '../shared/schema/templates'
import { instantiateSectionTemplate, instantiateTemplatePage, isSectionTemplate } from '../shared/schema/templates'
import {
  canBlockBeContainerChild,
  containerToPagePlacement,
  isContainerBlock,
  isPlacementWithinPlacement,
  pageToContainerPlacement,
  validateContainerResize,
} from '../shared/schema/blockHierarchy'
import {
  GRID_COLUMN_COUNT,
  GRID_DEFAULT_ROW_COUNT,
  collidesWithBlocks,
  findFirstAvailablePlacement,
  getBlockGridConstraints,
} from '../shared/schema/gridLayout'
import type { BlockGridConstraints, GridPlacement } from '../shared/schema/types'

type Props = {
  projectId?: string
  page: any
  pages?: Array<{ id: string; title?: string; path?: string; blocks?: any[] }>
  selectedPageId?: string
  addBlock: (b: any) => void
  applyBlockTransaction?: (mutator: (blocks: Block[]) => Block[], options?: { pageId?: string }) => void
  applyProjectTransaction?: (mutator: (project: Project) => Project, options?: { selectedPageId?: string }) => void
  setSelectedBlock: (b: any) => void
  editBlock: (b: any, options?: { recordHistory?: boolean }) => void
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
    applyBlockTransaction,
    applyProjectTransaction,
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
  const [activeContainerId, setActiveContainerId] = useState<string | null>(null)
  const [pendingContainerDelete, setPendingContainerDelete] = useState<Block | null>(null)
  const [templateInsertError, setTemplateInsertError] = useState<string | null>(null)
  const activeContainer = useMemo(
    () => (page?.blocks || []).find((block: Block) => block.id === activeContainerId && isContainerBlock(block)) ?? null,
    [activeContainerId, page?.blocks],
  )
  const pageSummary = useMemo(() => {
    if (!pageCount) return 'No pages yet'
    return `Page ${pageIndex} of ${pageCount}`
  }, [pageCount, pageIndex])

  useEffect(() => {
    if (!activeContainerId) return
    if (!activeContainer) setActiveContainerId(null)
  }, [activeContainer, activeContainerId])

  useEffect(() => {
    if (previewMode) setActiveContainerId(null)
  }, [previewMode])

  function handleAddBlock(block: Block) {
    setTemplateInsertError(null)
    if (!activeContainer || isContainerBlock(block) || !canBlockBeContainerChild(block, activeContainer)) {
      addBlock(block)
      return
    }

    const activeChildren = (page?.blocks || []).filter((candidate: Block) => candidate.parentId === activeContainer.id)
    const containerGrid = activeContainer.layout?.grid
    if (!containerGrid) {
      addBlock(block)
      return
    }

    const childBlock: Block = {
      ...block,
      parentId: activeContainer.id,
      layout: {
        ...(block.layout || {}),
        grid: findFirstAvailablePlacement(
          activeChildren,
          getContainerChildConstraints(getBlockGridConstraints(block), containerGrid),
          containerGrid.colSpan,
          containerGrid.rowSpan,
        ),
      },
    }

    if (applyBlockTransaction) {
      applyBlockTransaction((blocks: Block[]) => [...blocks, childBlock])
    } else {
      addBlock(childBlock)
    }
    setSelectedBlock(childBlock)
  }

  function handleAddTemplate(template: TemplateDefinition) {
    setTemplateInsertError(null)

    if (isSectionTemplate(template)) {
      if (!page || !applyBlockTransaction) {
        setTemplateInsertError('Section templates need an active page before they can be inserted.')
        return
      }

      const topLevelBlocks = (page.blocks || []).filter((candidate: Block) => !candidate.parentId)
      const templateConstraints = {
        defaultSpan: template.bounds,
        minSpan: { cols: 1, rows: 1 },
        maxSpan: template.bounds,
      }
      const placement = findFirstAvailablePlacement(
        topLevelBlocks,
        templateConstraints,
        GRID_COLUMN_COUNT,
        GRID_DEFAULT_ROW_COUNT,
      )

      if (collidesWithBlocks(placement, topLevelBlocks)) {
        setTemplateInsertError(`No open space for ${template.name}. Move or delete blocks, then try again.`)
        return
      }

      const insertedBlocks = instantiateSectionTemplate(template, placement)
      const rootBlock = insertedBlocks.find((block) => !block.parentId) ?? insertedBlocks[0]

      applyBlockTransaction((blocks: Block[]) => [...blocks, ...insertedBlocks])
      setActiveContainerId(rootBlock && isContainerBlock(rootBlock) ? rootBlock.id : null)
      setSelectedBlock(rootBlock)
      return
    }

    if (!applyProjectTransaction) {
      setTemplateInsertError('Page and app templates need project-level editing before they can be inserted.')
      return
    }

    const pageIdByKey = new Map(template.pages.map((pageDefinition) => [pageDefinition.key, crypto.randomUUID()]))
    const usedPaths = new Set<string>(
      (pages || [])
        .map((entry: Page) => entry.path)
        .filter((path: string | undefined): path is string => typeof path === 'string' && path.length > 0),
    )
    const newPages = template.pages.map((pageDefinition) => {
      const pageId = pageIdByKey.get(pageDefinition.key) ?? crypto.randomUUID()
      const path = getUniqueTemplatePath(pageDefinition.pathBase || pageDefinition.title, usedPaths)
      usedPaths.add(path)
      return instantiateTemplatePage(pageDefinition, pageId, path, pageIdByKey)
    })

    applyProjectTransaction(
      (project: Project) => ({
        ...project,
        pages: [...(project.pages || []), ...newPages],
      }),
      { selectedPageId: newPages[0]?.id },
    )
    setActiveContainerId(null)
    setSelectedBlock(null)
  }

  function handleDropNewBlock(block: Block, placement: GridPlacement, parentId?: string) {
    const parent = parentId ? (page?.blocks || []).find((candidate: Block) => candidate.id === parentId) : null
    const shouldAddToContainer =
      parent &&
      isContainerBlock(parent) &&
      !isContainerBlock(block) &&
      canBlockBeContainerChild(block, parent)

    if (parentId && !shouldAddToContainer) return

    const siblings = shouldAddToContainer
      ? (page?.blocks || []).filter((candidate: Block) => candidate.parentId === parentId)
      : (page?.blocks || []).filter((candidate: Block) => !candidate.parentId)

    if (collidesWithBlocks(placement, siblings)) return

    const nextBlock: Block = {
      ...block,
      parentId: shouldAddToContainer ? parentId : undefined,
      layout: {
        ...(block.layout || {}),
        grid: placement,
      },
      render: {
        ...(block.render || {}),
        offsetX: 0,
        offsetY: 0,
      },
    }

    if (applyBlockTransaction) {
      applyBlockTransaction((blocks: Block[]) => [...blocks, nextBlock])
    } else {
      addBlock(nextBlock)
    }

    if (shouldAddToContainer) setActiveContainerId(parentId ?? null)
    setSelectedBlock(nextBlock)
  }

  function enterContainer(container: Block) {
    if (!isContainerBlock(container)) return
    setActiveContainerId(container.id)
    setSelectedBlock(container)
  }

  function exitContainer() {
    setActiveContainerId(null)
    setSelectedBlock(null)
  }

  function handleSelectBlock(block: Block | null) {
    if (!block) {
      setSelectedBlock(null)
      return
    }

    if (activeContainerId && block.id !== activeContainerId && block.parentId !== activeContainerId) {
      setActiveContainerId(null)
    }

    setSelectedBlock(block)
  }

  function handleUpdateBlock(block: Block, options?: { recordHistory?: boolean }) {
    const currentBlock = (page?.blocks || []).find((candidate: Block) => candidate.id === block.id)
    const oldGrid = currentBlock?.layout?.grid
    const newGrid = block.layout?.grid
    const activeContainerGrid = activeContainer?.layout?.grid
    const isAttachToActiveContainer =
      activeContainer &&
      activeContainerGrid &&
      currentBlock &&
      !currentBlock.parentId &&
      currentBlock.id !== activeContainer.id &&
      !isContainerBlock(currentBlock) &&
      canBlockBeContainerChild(currentBlock, activeContainer) &&
      newGrid

    if (isAttachToActiveContainer) {
      const relativePlacement = pageToContainerPlacement(newGrid, activeContainerGrid)
      const activeChildren = (page?.blocks || []).filter((candidate: Block) => candidate.parentId === activeContainer.id)
      const canAttach =
        isPlacementWithinPlacement(relativePlacement, activeContainerGrid) &&
        !collidesWithBlocks(relativePlacement, activeChildren, block.id)

      if (canAttach && applyBlockTransaction) {
        const attachedBlock: Block = {
          ...block,
          parentId: activeContainer.id,
          layout: {
            ...(block.layout || {}),
            grid: relativePlacement,
          },
          render: {
            ...(block.render || {}),
            offsetX: 0,
            offsetY: 0,
          },
        }

        applyBlockTransaction((blocks: Block[]) =>
          blocks.map((candidate) => (candidate.id === attachedBlock.id ? attachedBlock : candidate)),
        )
        setSelectedBlock(attachedBlock)
        return
      }
    }

    const isContainerResize =
      currentBlock &&
      isContainerBlock(currentBlock) &&
      oldGrid &&
      newGrid &&
      (oldGrid.colSpan !== newGrid.colSpan || oldGrid.rowSpan !== newGrid.rowSpan)

    if (!isContainerResize) {
      editBlock(block, options)
      return
    }

    const children = (page?.blocks || []).filter((candidate: Block) => candidate.parentId === block.id)
    if (!children.length || !applyBlockTransaction) {
      editBlock(block, options)
      return
    }

    const resizeResult = validateContainerResize(children, oldGrid, newGrid)
    if (!resizeResult.valid) {
      setSelectedBlock(currentBlock)
      return
    }

    applyBlockTransaction((blocks: Block[]) =>
      blocks.map((candidate) => {
        if (candidate.id === block.id) return block
        const nextPlacement = resizeResult.placements.get(candidate.id)
        if (!nextPlacement) return candidate

        return {
          ...candidate,
          layout: {
            ...(candidate.layout || {}),
            grid: nextPlacement,
          },
          render: {
            ...(candidate.render || {}),
            widthPx: undefined,
            heightPx: undefined,
            offsetX: 0,
            offsetY: 0,
          },
        }
      }),
    )
    setSelectedBlock(block)
  }

  function detachBlockToPage(block: Block) {
    if (!block.parentId || !applyBlockTransaction) return

    const topLevelBlocks = (page?.blocks || []).filter((candidate: Block) => !candidate.parentId && candidate.id !== block.id)
    const detachedBlock: Block = {
      ...block,
      parentId: undefined,
      layout: {
        ...(block.layout || {}),
        grid: findFirstAvailablePlacement(topLevelBlocks, getBlockGridConstraints(block)),
      },
      render: {
        ...(block.render || {}),
        offsetX: 0,
        offsetY: 0,
      },
    }

    applyBlockTransaction((blocks: Block[]) =>
      blocks.map((candidate) => (candidate.id === detachedBlock.id ? detachedBlock : candidate)),
    )
    setActiveContainerId(null)
    setSelectedBlock(detachedBlock)
  }

  function detachBlockToPagePlacement(block: Block, placement: GridPlacement) {
    if (!block.parentId || !applyBlockTransaction) return

    const detachedBlock: Block = {
      ...block,
      parentId: undefined,
      layout: {
        ...(block.layout || {}),
        grid: placement,
      },
      render: {
        ...(block.render || {}),
        offsetX: 0,
        offsetY: 0,
      },
    }

    applyBlockTransaction((blocks: Block[]) =>
      blocks.map((candidate) => (candidate.id === detachedBlock.id ? detachedBlock : candidate)),
    )
    setActiveContainerId(null)
    setSelectedBlock(detachedBlock)
  }

  function deleteContainerAndChildren(container: Block) {
    setPendingContainerDelete(null)
    setSelectedBlock(null)
    if (container.id === activeContainerId) setActiveContainerId(null)
    deleteBlock(container.id)
  }

  function deleteContainerKeepChildren(container: Block) {
    if (!applyBlockTransaction) {
      deleteContainerAndChildren(container)
      return
    }

    const containerGrid = container.layout?.grid
    applyBlockTransaction((blocks: Block[]) => {
      const placedTopLevel: Block[] = blocks.filter(
        (candidate) => !candidate.parentId && candidate.id !== container.id,
      )

      return blocks.flatMap((candidate) => {
        if (candidate.id === container.id) return []
        if (candidate.parentId !== container.id) return [candidate]

        const proposedGrid = candidate.layout?.grid && containerGrid
          ? containerToPagePlacement(candidate.layout.grid, containerGrid)
          : null
        const nextGrid =
          proposedGrid && !collidesWithBlocks(proposedGrid, placedTopLevel)
            ? proposedGrid
            : findFirstAvailablePlacement(placedTopLevel, getBlockGridConstraints(candidate))

        const detachedChild: Block = {
          ...candidate,
          parentId: undefined,
          layout: {
            ...(candidate.layout || {}),
            grid: nextGrid,
          },
          render: {
            ...(candidate.render || {}),
            offsetX: 0,
            offsetY: 0,
          },
        }
        placedTopLevel.push(detachedChild)
        return [detachedChild]
      })
    })

    setPendingContainerDelete(null)
    setSelectedBlock(null)
    if (container.id === activeContainerId) setActiveContainerId(null)
  }

  function getContainerChildConstraints(
    constraints: BlockGridConstraints,
    containerGrid: GridPlacement,
  ): BlockGridConstraints {
    const maxCols = Math.max(1, containerGrid.colSpan)
    const maxRows = Math.max(1, containerGrid.rowSpan)
    const defaultCols = Math.min(constraints.defaultSpan.cols, maxCols)
    const defaultRows = Math.min(constraints.defaultSpan.rows, maxRows)

    return {
      ...constraints,
      defaultSpan: {
        cols: Math.max(1, defaultCols),
        rows: Math.max(1, defaultRows),
      },
      minSpan: {
        cols: Math.min(constraints.minSpan.cols, Math.max(1, defaultCols)),
        rows: Math.min(constraints.minSpan.rows, Math.max(1, defaultRows)),
      },
      maxSpan: {
        cols: Math.min(constraints.maxSpan.cols, maxCols),
        rows: Math.min(constraints.maxSpan.rows, maxRows),
      },
    }
  }

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
            {activeContainer ? (
              <button
                type="button"
                className="ghost-btn !px-4 !py-3 text-sm"
                onClick={exitContainer}
              >
                Exit Container
              </button>
            ) : null}
            <button
              type="button"
              className="btn min-w-[120px]"
              onClick={() => {
                const next = !previewMode
                onPreviewModeChange?.(next)
                if (next) {
                  setSelectedBlock(null)
                  setActiveContainerId(null)
                }
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
                <span className="editor-kicker">Drag to place</span>
              </div>
              <AddBlock onAdd={handleAddBlock} onAddTemplate={handleAddTemplate} />
              {templateInsertError ? (
                <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                  {templateInsertError}
                </div>
              ) : null}
              {activeContainer ? (
                <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">
                  Adding into selected container. Click Exit Container to add to the page again.
                </div>
              ) : null}
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
              {activeContainer ? <span className="editor-pill">Editing container</span> : null}
              <span className="editor-pill">{pageSummary}</span>
              <span className="editor-pill">{blockCount} blocks</span>
            </div>
          </div>

          {page ? (
            <PageRenderer
              page={page}
              projectId={projectId}
              selectedBlockId={selectedBlock?.id}
              activeContainerId={activeContainerId}
              previewMode={previewMode}
              onNavigate={(targetPageId: string) => {
                if (!previewMode) return
                selectPage?.(targetPageId)
              }}
              onSelectBlock={(block: any) => handleSelectBlock(block)}
              onEnterContainer={(block: any) => enterContainer(block)}
              onExitContainer={exitContainer}
              onUpdateBlock={handleUpdateBlock}
              onDetachBlockFromContainer={detachBlockToPagePlacement}
              onDropNewBlock={handleDropNewBlock}
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
              projectId={projectId}
              pages={pages}
              activeContainerId={activeContainerId}
              onEditContainer={(block: any) => enterContainer(block)}
              onExitContainer={exitContainer}
              onDetachBlock={(block: any) => detachBlockToPage(block)}
              onSave={(block: any) => {
                setSelectedBlock(block)
                handleUpdateBlock(block)
              }}
              onPreview={(block: any) => {
                setSelectedBlock(block)
                handleUpdateBlock(block, { recordHistory: false })
              }}
              onClose={() => setSelectedBlock(null)}
              onDelete={(id: string) => {
                const block = (page?.blocks || []).find((candidate: Block) => candidate.id === id)
                if (block && isContainerBlock(block) && (page?.blocks || []).some((candidate: Block) => candidate.parentId === id)) {
                  setPendingContainerDelete(block)
                  return
                }

                setSelectedBlock(null)
                if (id === activeContainerId) setActiveContainerId(null)
                deleteBlock(id)
              }}
            />
          </div>
        </div>
      </aside>

      {pendingContainerDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[1.85rem] border border-slate-200 bg-[#fffcf6] p-6 shadow-2xl">
            <div className="editor-section-title">Delete container</div>
            <h3 className="section-heading mt-2 text-2xl font-semibold text-slate-900">
              What should happen to the blocks inside?
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This container has child blocks. You can delete everything, move the child blocks back onto the page,
              or cancel.
            </p>
            <div className="mt-6 grid gap-3">
              <button
                type="button"
                className="btn"
                onClick={() => deleteContainerKeepChildren(pendingContainerDelete)}
              >
                Delete container, keep child blocks
              </button>
              <button
                type="button"
                className="ghost-btn !justify-center !text-red-700"
                onClick={() => deleteContainerAndChildren(pendingContainerDelete)}
              >
                Delete container and children
              </button>
              <button
                type="button"
                className="ghost-btn !justify-center"
                onClick={() => setPendingContainerDelete(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

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

function getUniqueTemplatePath(base: string, usedPaths: Set<string>): string {
  const baseSlug = slugifyTemplatePath(base) || 'page'
  let candidate = `/${baseSlug}`
  let index = 2

  while (usedPaths.has(candidate)) {
    candidate = `/${baseSlug}-${index}`
    index += 1
  }

  return candidate
}

function slugifyTemplatePath(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}
