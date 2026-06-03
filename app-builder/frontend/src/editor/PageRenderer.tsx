// © 2025 Preston Willis. All rights reserved.
import type { Page, Block, GridPlacement } from '../shared/schema/types'
import {
  collidesWithBlocks,
  derivePlacementFromPixelRect,
  getBlockGridConstraints,
  getGridRowCount,
  getPlacementRect,
  GRID_COLUMN_COUNT,
  GRID_GAP,
  GRID_PADDING,
  GRID_ROW_HEIGHT,
} from '../shared/schema/gridLayout'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DraggableBlock } from './DraggableBlock'

type GridPreview = {
  blockId: string
  placement: GridPlacement
  rect: ReturnType<typeof getPlacementRect>
  valid: boolean
}
export function PageRenderer({
  page,
  projectId,
  selectedBlockId,
  previewMode,
  onNavigate,
  onSelectBlock,
  onReorder: _onReorder,
  onUpdateBlock,
}: {
  page: Page
  projectId?: string
  selectedBlockId?: string
  previewMode?: boolean
  onNavigate?: (pageId: string) => void
  onSelectBlock?: (b: Block | null) => void
  onReorder?: (newBlocks: Block[]) => void
  onUpdateBlock?: (b: Block) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [showHGuide, setShowHGuide] = useState(false)
  const [showVGuide, setShowVGuide] = useState(false)
  const [isDragTargeting, setIsDragTargeting] = useState(false)
  const [gridPreview, setGridPreview] = useState<GridPreview | null>(null)
  const [screenWidth, setScreenWidth] = useState(390)
  const [screenHeight, setScreenHeight] = useState(640)
  const selectedBlock = selectedBlockId ? page.blocks.find((block) => block.id === selectedBlockId) : null

  useEffect(() => {
    setIsDragTargeting(false)
    setGridPreview(null)
    setShowHGuide(false)
    setShowVGuide(false)
  }, [page.id, page.blocks.length])

  const debugSelectedLayout = selectedBlock?.layout?.grid
  const debugSelectedRender = selectedBlock?.render

  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    const updateSize = () => {
      const nextWidth = Math.max(320, Math.round(node.clientWidth))
      const nextHeight = Math.max(320, Math.round(node.clientHeight))
      setScreenWidth((current) => (current === nextWidth ? current : nextWidth))
      setScreenHeight((current) => (current === nextHeight ? current : nextHeight))
    }

    updateSize()

    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => updateSize())
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const visibleRowCount = useMemo(() => {
    const availableHeight = Math.max(0, screenHeight - GRID_PADDING * 2)
    return Math.max(8, Math.floor((availableHeight + GRID_GAP) / (GRID_ROW_HEIGHT + GRID_GAP)))
  }, [screenHeight])

  const gridRowCount = useMemo(
    () => Math.max(visibleRowCount, getGridRowCount(page.blocks) + 2),
    [page.blocks, visibleRowCount],
  )

  const gridCellCount = gridRowCount * GRID_COLUMN_COUNT
  const gridHeight = gridRowCount * GRID_ROW_HEIGHT + Math.max(0, gridRowCount - 1) * GRID_GAP
  const gridTopInset = Math.max(GRID_PADDING, Math.floor((screenHeight - gridHeight) / 2))
  const gridMetrics = useMemo(
    () => ({
      canvasWidth: screenWidth,
      columnCount: GRID_COLUMN_COUNT,
      rowHeight: GRID_ROW_HEIGHT,
      gap: GRID_GAP,
      paddingX: GRID_PADDING,
      paddingY: gridTopInset,
    }),
    [screenWidth, gridTopInset],
  )

  function handleGridPreviewChange(next: { blockId: string; left: number; top: number; width: number; height: number } | null) {
    if (!next) {
      setGridPreview(null)
      return
    }

    const block = page.blocks.find((entry) => entry.id === next.blockId)
    if (!block) {
      setGridPreview(null)
      return
    }

    const placement = derivePlacementFromPixelRect(
      {
        left: next.left,
        top: next.top,
        width: next.width,
        height: next.height,
      },
      gridMetrics,
      getBlockGridConstraints(block),
      GRID_COLUMN_COUNT,
    )

    const rect = getPlacementRect(placement, gridMetrics)

    setGridPreview({
      blockId: next.blockId,
      placement,
      rect,
      valid: !collidesWithBlocks(placement, page.blocks, next.blockId),
    })
  }

  return (
    <div className="editor-stage mt-5 px-5 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="editor-section-title">Device Preview</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{previewMode ? 'Customer view' : 'Layout workspace'}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="editor-pill">{page.blocks.length} blocks</span>
          <span className="editor-pill">{previewMode ? 'Interactions enabled' : 'Drag blocks or resize width and height'}</span>
        </div>
      </div>

      {!previewMode ? (
        <div className="mb-4 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-xs text-slate-600 shadow-sm">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <span><span className="font-semibold text-slate-900">Grid:</span> {GRID_COLUMN_COUNT} cols x {gridRowCount} rows</span>
            <span><span className="font-semibold text-slate-900">Selected block:</span> {selectedBlock?.id ?? 'none'}</span>
            <span>
              <span className="font-semibold text-slate-900">Placement:</span>{' '}
              {debugSelectedLayout
                ? `c${debugSelectedLayout.colStart} r${debugSelectedLayout.rowStart} ${debugSelectedLayout.colSpan}x${debugSelectedLayout.rowSpan}`
                : 'none'}
            </span>
            <span>
              <span className="font-semibold text-slate-900">Render:</span>{' '}
              {debugSelectedRender?.widthPx || debugSelectedRender?.heightPx
                ? `${debugSelectedRender.widthPx ?? 'auto'} x ${debugSelectedRender.heightPx ?? 'auto'}`
                : 'default'}
            </span>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex w-full justify-center">
        <div className="phone-frame shadow-sm">
          <div
            ref={containerRef}
            className="phone-screen"
            style={{ minHeight: 640, touchAction: previewMode ? 'auto' : 'none' }}
            onPointerDown={
              previewMode
                ? undefined
                : (event) => {
                    if (event.target !== event.currentTarget) return
                    setIsDragTargeting(false)
                    setGridPreview(null)
                    onSelectBlock?.(null)
                  }
            }
          >
            {!previewMode ? (
              <div
                className={`editor-grid-overlay ${isDragTargeting ? 'editor-grid-overlay-active' : ''}`}
                style={{
                  top: gridTopInset,
                  left: GRID_PADDING,
                  right: GRID_PADDING,
                  height: gridHeight,
                  gridTemplateColumns: `repeat(${GRID_COLUMN_COUNT}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${gridRowCount}, ${GRID_ROW_HEIGHT}px)`,
                  gap: GRID_GAP,
                }}
              >
                {Array.from({ length: gridCellCount }, (_, index) => (
                  <div key={`grid-cell-${index}`} className="editor-grid-cell" />
                ))}
              </div>
            ) : null}
            {!previewMode && gridPreview ? (
              <div
                className={`editor-grid-preview ${gridPreview.valid ? '' : 'editor-grid-preview-invalid'}`}
                style={gridPreview.rect}
              >
                <span className="editor-grid-preview-label">
                  {`${gridPreview.placement.colSpan} x ${gridPreview.placement.rowSpan}`}
                  {!gridPreview.valid ? ' blocked' : ''}
                </span>
              </div>
            ) : null}
            {!previewMode && showHGuide ? (
              <div className="absolute left-0 right-0 border-t border-dashed border-sky-400" style={{ top: '50%' }} />
            ) : null}
            {!previewMode && showVGuide ? (
              <div className="absolute top-0 bottom-0 border-l border-dashed border-sky-400" style={{ left: '50%' }} />
            ) : null}

            {page.blocks.map((block, index) => (
              <DraggableBlock
                key={block.id}
                block={block}
                isActive={selectedBlockId === block.id}
                projectId={projectId}
                index={index}
                containerRef={containerRef}
                gridMetrics={gridMetrics}
                previewMode={previewMode}
                onNavigate={onNavigate}
                onDragStateChange={previewMode ? undefined : setIsDragTargeting}
                onGridPreviewChange={previewMode ? undefined : handleGridPreviewChange}
                dropPreviewValid={gridPreview?.blockId === block.id ? gridPreview.valid : undefined}
                dropPreviewPlacement={gridPreview?.blockId === block.id ? gridPreview.placement : block.layout?.grid}
                onSelect={previewMode ? undefined : onSelectBlock}
                onUpdate={previewMode ? undefined : onUpdateBlock}
                onSnapChange={({ h, v }) => {
                  if (previewMode) return
                  setShowHGuide(h)
                  setShowVGuide(v)
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}


