// © 2025 Preston Willis. All rights reserved.
import { BlockRenderer } from './shared/BlockRenderer'
import type { Page, Block } from './shared/schema/types'
import { BlockRegistry } from './shared/schema/registry'
import {
  clampRenderMetadataToPlacement,
  collidesWithBlocks,
  derivePlacementFromPixelRect,
  getBlockGridConstraints,
  getGridRowCount,
  getPlacementRect,
  type GridMetrics,
  GRID_COLUMN_COUNT,
  GRID_GAP,
  GRID_PADDING,
  GRID_ROW_HEIGHT,
  resolveBlockRenderRect,
} from './shared/schema/gridLayout'
import { getBlockEditorPlacement } from './shared/schema/runtimeLayout'
import { useEffect, useMemo, useRef, useState } from 'react'

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
const MIN_BLOCK_WIDTH = 120
const MIN_BLOCK_HEIGHT = 72
const MIN_SCALE = 0.5
const MAX_SCALE = 2.6

type ResizeMode = 'uniform' | 'horizontal' | 'vertical'
type GridPreview = {
  blockId: string
  placement: NonNullable<Block['layout']>['grid']
  rect: ReturnType<typeof getPlacementRect>
  valid: boolean
}

type SaveBlockOptions = {
  usePreviewRect?: boolean
}

type DraggableProps = {
  block: Block
  isActive?: boolean
  projectId?: string
  index: number
  containerRef: React.RefObject<HTMLDivElement | null>
  gridMetrics: GridMetrics
  previewMode?: boolean
  onNavigate?: (pageId: string) => void
  onDragStateChange?: (dragging: boolean) => void
  onGridPreviewChange?: (preview: { blockId: string; left: number; top: number; width: number; height: number } | null) => void
  dropPreviewValid?: boolean
  dropPreviewPlacement?: NonNullable<Block['layout']>['grid']
  dropPreviewRect?: { left: number; top: number }
  onSelect?: (b: Block) => void
  onUpdate?: (b: Block) => void
  onSnapChange?: (snap: { h: boolean; v: boolean }) => void
}

function DraggableBlock({
  block,
  isActive,
  projectId,
  index,
  containerRef,
  gridMetrics,
  previewMode,
  onNavigate,
  onDragStateChange,
  onGridPreviewChange,
  dropPreviewValid,
  dropPreviewPlacement,
  dropPreviewRect,
  onSelect,
  onUpdate,
  onSnapChange,
}: DraggableProps) {
  const placement = getBlockEditorPlacement(block, index)
  const elRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const cornerResizeHandleRef = useRef<HTMLButtonElement | null>(null)
  const horizontalResizeHandleRef = useRef<HTMLButtonElement | null>(null)
  const verticalResizeHandleRef = useRef<HTMLButtonElement | null>(null)
  const innerMoveHandleRef = useRef<HTMLButtonElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const [resizingMode, setResizingMode] = useState<ResizeMode | null>(null)
  const [innerMoving, setInnerMoving] = useState(false)
  const [startPt, setStartPt] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [startPos, setStartPos] = useState<{ x: number; y: number }>({ x: placement.x, y: placement.y })
  const [startOffset, setStartOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: placement.x, y: placement.y })
  const [startScale, setStartScale] = useState<{ x: number; y: number }>({ x: placement.scaleX, y: placement.scaleY })
  const [scaleX, setScaleX] = useState<number>(placement.scaleX)
  const [scaleY, setScaleY] = useState<number>(placement.scaleY)
  const [baseSize, setBaseSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })
  const [renderSize, setRenderSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })
  const [moved, setMoved] = useState(false)
  const resolvedRect = useMemo(() => resolveBlockRenderRect(block, gridMetrics), [block, gridMetrics])

  useEffect(() => {
    const fallbackPlacement = getBlockEditorPlacement(block, index)

    if (resolvedRect) {
      setPos({ x: Math.round(resolvedRect.left), y: Math.round(resolvedRect.top) })
      if (baseSize.width > 0 && baseSize.height > 0) {
        setScaleX(Number((resolvedRect.width / baseSize.width).toFixed(3)))
        setScaleY(Number((resolvedRect.height / baseSize.height).toFixed(3)))
      } else {
        setScaleX(fallbackPlacement.scaleX)
        setScaleY(fallbackPlacement.scaleY)
      }
      return
    }

    setPos({ x: fallbackPlacement.x, y: fallbackPlacement.y })
    setScaleX(fallbackPlacement.scaleX)
    setScaleY(fallbackPlacement.scaleY)
  }, [resolvedRect, block, index, baseSize.width, baseSize.height])

  useEffect(() => {
    const node = contentRef.current
    if (!node || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const nextWidth = Math.max(MIN_BLOCK_WIDTH, Math.round(entry.contentRect.width))
      const nextHeight = Math.max(MIN_BLOCK_HEIGHT, Math.round(entry.contentRect.height))
      setBaseSize((current) => {
        if (current.width === nextWidth && current.height === nextHeight) return current
        return { width: nextWidth, height: nextHeight }
      })
    })

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const node = contentRef.current
    if (!node) return

    const updateRenderSize = () => {
      const rect = node.getBoundingClientRect()
      const nextWidth = Math.max(MIN_BLOCK_WIDTH, Math.round(rect.width))
      const nextHeight = Math.max(MIN_BLOCK_HEIGHT, Math.round(rect.height))
      setRenderSize((current) => {
        if (current.width === nextWidth && current.height === nextHeight) return current
        return { width: nextWidth, height: nextHeight }
      })
    }

    const frame = window.requestAnimationFrame(updateRenderSize)
    return () => window.cancelAnimationFrame(frame)
  }, [baseSize.width, baseSize.height, scaleX, scaleY, block.id, block.props, block.render])

  function begin(e: React.PointerEvent) {
    if (previewMode) return
    const targetNode = e.target as Node
    if (
      innerMoveHandleRef.current?.contains(targetNode) ||
      cornerResizeHandleRef.current?.contains(targetNode) ||
      horizontalResizeHandleRef.current?.contains(targetNode) ||
      verticalResizeHandleRef.current?.contains(targetNode)
    ) return
    const target = e.currentTarget as Element
    ;(target as any).setPointerCapture?.(e.pointerId)
    setStartPt({ x: e.clientX, y: e.clientY })
    setStartPos(pos)
    setDragging(true)
    onDragStateChange?.(true)
    const width = renderedWidth ?? elRef.current?.offsetWidth ?? 0
    const height = renderedHeight ?? elRef.current?.offsetHeight ?? 0
    onGridPreviewChange?.({ blockId: block.id, left: pos.x, top: pos.y, width, height })
    setMoved(false)
    onSelect?.(block)
    onSnapChange?.({ h: false, v: false })
  }

  function beginResize(mode: ResizeMode, e: React.PointerEvent<HTMLButtonElement>) {
    if (previewMode) return
    e.stopPropagation()
    const target = e.currentTarget as Element
    ;(target as any).setPointerCapture?.(e.pointerId)
    setStartPt({ x: e.clientX, y: e.clientY })
    setStartScale({ x: scaleX, y: scaleY })
    setResizingMode(mode)
    onDragStateChange?.(true)
    const width = renderedWidth ?? elRef.current?.offsetWidth ?? 0
    const height = renderedHeight ?? elRef.current?.offsetHeight ?? 0
    onGridPreviewChange?.({ blockId: block.id, left: pos.x, top: pos.y, width, height })
    setMoved(true)
    onSelect?.(block)
  }

  function beginInnerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (previewMode || !block.layout?.grid) return
    e.stopPropagation()
    const target = e.currentTarget as Element
    ;(target as any).setPointerCapture?.(e.pointerId)
    const clampedRender = clampRenderMetadataToPlacement(block.render, block.layout.grid, gridMetrics)
    setStartPt({ x: e.clientX, y: e.clientY })
    setStartPos(pos)
    setStartOffset({ x: clampedRender.offsetX ?? 0, y: clampedRender.offsetY ?? 0 })
    setInnerMoving(true)
    setMoved(true)
    onSelect?.(block)
    onSnapChange?.({ h: false, v: false })
  }

  function move(e: React.PointerEvent) {
    if (previewMode) return

    if (innerMoving) {
      const placement = block.layout?.grid
      const width = renderedWidth ?? elRef.current?.offsetWidth ?? 0
      const height = renderedHeight ?? elRef.current?.offsetHeight ?? 0
      if (!placement || !width || !height) return

      const placementRect = getPlacementRect(placement, gridMetrics)
      const maxOffsetX = Math.max(0, (placementRect.width - width) / 2)
      const maxOffsetY = Math.max(0, (placementRect.height - height) / 2)
      const dx = e.clientX - startPt.x
      const dy = e.clientY - startPt.y
      const nextOffsetX = clamp(startOffset.x + dx, -maxOffsetX, maxOffsetX)
      const nextOffsetY = clamp(startOffset.y + dy, -maxOffsetY, maxOffsetY)
      const centeredX = placementRect.left + Math.max(0, (placementRect.width - width) / 2)
      const centeredY = placementRect.top + Math.max(0, (placementRect.height - height) / 2)

      setPos({
        x: Math.round(centeredX + nextOffsetX),
        y: Math.round(centeredY + nextOffsetY),
      })
      return
    }

    if (resizingMode) {
      const dx = e.clientX - startPt.x
      const dy = e.clientY - startPt.y
      const baseWidth = Math.max(baseSize.width || MIN_BLOCK_WIDTH, MIN_BLOCK_WIDTH)
      const baseHeight = Math.max(baseSize.height || MIN_BLOCK_HEIGHT, MIN_BLOCK_HEIGHT)

      if (resizingMode === 'horizontal') {
        const nextScaleX = clamp((baseWidth * startScale.x + dx) / baseWidth, MIN_SCALE, MAX_SCALE)
        setScaleX(Number(nextScaleX.toFixed(3)))
        onGridPreviewChange?.({
          blockId: block.id,
          left: pos.x,
          top: pos.y,
          width: Math.round(baseWidth * nextScaleX),
          height: renderedHeight ?? Math.round(baseHeight * scaleY),
        })
        return
      }

      if (resizingMode === 'vertical') {
        const nextScaleY = clamp((baseHeight * startScale.y + dy) / baseHeight, MIN_SCALE, MAX_SCALE)
        setScaleY(Number(nextScaleY.toFixed(3)))
        onGridPreviewChange?.({
          blockId: block.id,
          left: pos.x,
          top: pos.y,
          width: renderedWidth ?? Math.round(baseWidth * scaleX),
          height: Math.round(baseHeight * nextScaleY),
        })
        return
      }

      const nextScaleX = clamp((baseWidth * startScale.x + dx) / baseWidth, MIN_SCALE, MAX_SCALE)
      const nextScaleY = clamp((baseHeight * startScale.y + dy) / baseHeight, MIN_SCALE, MAX_SCALE)
      setScaleX(Number(nextScaleX.toFixed(3)))
      setScaleY(Number(nextScaleY.toFixed(3)))
      onGridPreviewChange?.({
        blockId: block.id,
        left: pos.x,
        top: pos.y,
        width: Math.round(baseWidth * nextScaleX),
        height: Math.round(baseHeight * nextScaleY),
      })
      return
    }

    if (!dragging) return
    const container = containerRef.current
    if (!container) return
    const width = renderedWidth ?? elRef.current?.offsetWidth ?? 0
    const height = renderedHeight ?? elRef.current?.offsetHeight ?? 0
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

    const dx = e.clientX - startPt.x
    const dy = e.clientY - startPt.y
    let nx = startPos.x + dx
    let ny = startPos.y + dy

    nx = clamp(nx, 0, Math.max(0, containerWidth - width))
    ny = clamp(ny, 0, Math.max(0, containerHeight - height))

    const snapDistance = 8
    const centerX = containerWidth / 2
    const centerY = containerHeight / 2
    const blockCenterX = nx + width / 2
    const blockCenterY = ny + height / 2
    const snapVertical = Math.abs(blockCenterX - centerX) <= snapDistance
    const snapHorizontal = Math.abs(blockCenterY - centerY) <= snapDistance

    if (snapVertical) nx = centerX - width / 2
    if (snapHorizontal) ny = centerY - height / 2

    onSnapChange?.({ h: snapHorizontal, v: snapVertical })
    setPos({ x: Math.round(nx), y: Math.round(ny) })
    onGridPreviewChange?.({ blockId: block.id, left: Math.round(nx), top: Math.round(ny), width, height })
    if (!moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) setMoved(true)
  }

  function saveBlock(nextScaleX = scaleX, nextScaleY = scaleY, options: SaveBlockOptions = {}) {
    const usePreviewRect = options.usePreviewRect ?? true
    const finalWidth = baseSize.width ? Math.round(baseSize.width * nextScaleX) : renderedWidth
    const finalHeight = baseSize.height ? Math.round(baseSize.height * nextScaleY) : renderedHeight
    const nextGrid = dropPreviewPlacement ?? block.layout?.grid
    const alignedPreviewPos =
      usePreviewRect && nextGrid && finalWidth && finalHeight
        ? getAlignedPositionForPlacement(nextGrid, finalWidth, finalHeight, gridMetrics)
        : null
    const finalX = alignedPreviewPos ? alignedPreviewPos.x : pos.x
    const finalY = alignedPreviewPos ? alignedPreviewPos.y : pos.y
    const currentProps = (block.props || {}) as Record<string, any>
    const { width: _oldWidth, height: _oldHeight, scale: _oldScale, ...rest } = currentProps
    const nextRender =
      nextGrid && finalWidth && finalHeight
        ? clampRenderMetadataToPlacement(
            {
              ...(block.render || {}),
              widthPx: finalWidth,
              heightPx: finalHeight,
              offsetX: computeCenteredOffset(finalX, finalWidth, nextGrid, gridMetrics, 'x'),
              offsetY: computeCenteredOffset(finalY, finalHeight, nextGrid, gridMetrics, 'y'),
            },
            nextGrid,
            gridMetrics,
          )
        : {
            ...(block.render || {}),
            widthPx: finalWidth,
            heightPx: finalHeight,
          }

    onUpdate?.({
      ...block,
      layout: nextGrid
        ? {
            ...(block.layout || {}),
            grid: nextGrid,
          }
        : block.layout,
      render: nextRender,
      props: { ...rest, x: finalX, y: finalY, scaleX: nextScaleX, scaleY: nextScaleY } as any,
      editorPlacement: { x: finalX, y: finalY, scaleX: nextScaleX, scaleY: nextScaleY },
    })
  }

  function end(e: React.PointerEvent) {
    if (previewMode) return

    if (innerMoving) {
      const target = e.target as Element
      ;(target as any).releasePointerCapture?.(e.pointerId)
      setInnerMoving(false)
      onSnapChange?.({ h: false, v: false })
      saveBlock(scaleX, scaleY, { usePreviewRect: false })
      return
    }

    if (resizingMode) {
      const target = e.target as Element
      ;(target as any).releasePointerCapture?.(e.pointerId)
      setResizingMode(null)
      onDragStateChange?.(false)
      onSnapChange?.({ h: false, v: false })
      onGridPreviewChange?.(null)
      if (dropPreviewValid === false) {
        setScaleX(startScale.x)
        setScaleY(startScale.y)
        return
      }
      if (dropPreviewPlacement) {
        const finalWidth = baseSize.width ? Math.round(baseSize.width * scaleX) : renderedWidth
        const finalHeight = baseSize.height ? Math.round(baseSize.height * scaleY) : renderedHeight
        if (finalWidth && finalHeight) {
          setPos(getAlignedPositionForPlacement(dropPreviewPlacement, finalWidth, finalHeight, gridMetrics))
        }
      }
      saveBlock(scaleX, scaleY, { usePreviewRect: true })
      return
    }

    if (!dragging) return
    const target = e.currentTarget as Element
    ;(target as any).releasePointerCapture?.(e.pointerId)
    setDragging(false)
    onDragStateChange?.(false)
    onGridPreviewChange?.(null)
    onSnapChange?.({ h: false, v: false })
    if (dropPreviewValid === false) {
      setPos(startPos)
      return
    }
    if (dropPreviewPlacement) {
      const width = renderedWidth ?? elRef.current?.offsetWidth ?? 0
      const height = renderedHeight ?? elRef.current?.offsetHeight ?? 0
      if (width && height) {
        setPos(getAlignedPositionForPlacement(dropPreviewPlacement, width, height, gridMetrics))
      }
    }
    saveBlock(scaleX, scaleY, { usePreviewRect: true })
    if (!moved) onSelect?.(block)
  }

  const liveWidth = renderSize.width || (baseSize.width ? Math.round(baseSize.width * scaleX) : undefined)
  const liveHeight = renderSize.height || (baseSize.height ? Math.round(baseSize.height * scaleY) : undefined)
  const renderedWidth = resizingMode
    ? (baseSize.width ? Math.round(baseSize.width * scaleX) : liveWidth)
    : resolvedRect?.width
      ? Math.round(resolvedRect.width)
      : liveWidth
  const renderedHeight = resizingMode
    ? (baseSize.height ? Math.round(baseSize.height * scaleY) : liveHeight)
    : resolvedRect?.height
      ? Math.round(resolvedRect.height)
      : liveHeight
  const contentWidth = resizingMode
    ? (baseSize.width || undefined)
    : renderedWidth
      ? Math.max(1, Math.round(renderedWidth / Math.max(scaleX, 0.001)))
      : undefined
  const showActiveFrame = Boolean(isActive || dragging || resizingMode || innerMoving)

  return (
    <div
      ref={elRef}
      className="absolute select-none"
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        width: renderedWidth,
        height: renderedHeight,
        zIndex: dragging || resizingMode ? 100 : 'auto',
      }}
      onPointerDown={previewMode ? undefined : begin}
      onPointerMove={previewMode ? undefined : move}
      onPointerUp={previewMode ? undefined : end}
      onPointerCancel={previewMode ? undefined : end}
    >
      <div
        className={
          previewMode
            ? ''
            : `group relative box-border rounded-[1.2rem] transition-shadow ${
                showActiveFrame
                  ? 'border border-blue-400/90 ring-2 ring-blue-200/70 shadow-[0_0_0_6px_rgba(37,99,235,0.08)]'
                  : 'border border-transparent hover:border-blue-300/70'
              }`
        }
        style={{ width: renderedWidth, height: renderedHeight }}
      >
        <div
          ref={contentRef}
          style={{
            width: contentWidth ?? 'max-content',
            maxWidth: contentWidth,
            transform: `scale(${scaleX}, ${scaleY})`,
            transformOrigin: 'top left',
          }}
        >
          <BlockRenderer
            block={block}
            projectId={projectId}
            previewMode={previewMode}
            onNavigate={previewMode ? onNavigate : undefined}
          />
        </div>

        {!previewMode ? (
          <>
            {block.layout?.grid ? (
              <button
                ref={innerMoveHandleRef}
                type="button"
                aria-label="Move block within its grid area"
                className={`absolute left-[-10px] top-[-10px] flex h-6 w-6 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-600 shadow-md transition-opacity hover:bg-blue-50 ${
                  showActiveFrame ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                style={{ touchAction: 'none', cursor: 'grab' }}
                onPointerDown={beginInnerMove}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={end}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M6 1.5V10.5M1.5 6H10.5M3.5 3.5L1.5 6L3.5 8.5M8.5 3.5L10.5 6L8.5 8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ) : null}
            <button
              ref={horizontalResizeHandleRef}
              type="button"
              aria-label="Resize block width"
              className={`absolute right-[-10px] top-1/2 flex h-8 w-5 -translate-y-1/2 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-600 shadow-md transition-opacity hover:bg-blue-50 ${
                showActiveFrame ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
              style={{ touchAction: 'none', cursor: 'ew-resize' }}
              onPointerDown={(event) => beginResize('horizontal', event)}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={end}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path d="M1 5H9M6 2L9 5L6 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              ref={verticalResizeHandleRef}
              type="button"
              aria-label="Resize block height"
              className={`absolute bottom-[-10px] left-1/2 flex h-5 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-600 shadow-md transition-opacity hover:bg-blue-50 ${
                showActiveFrame ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
              style={{ touchAction: 'none', cursor: 'ns-resize' }}
              onPointerDown={(event) => beginResize('vertical', event)}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={end}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path d="M5 1V9M2 4L5 1L8 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              ref={cornerResizeHandleRef}
              type="button"
              aria-label="Resize block"
              className={`absolute bottom-[-10px] right-[-10px] flex h-6 w-6 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-600 shadow-md transition-opacity hover:bg-blue-50 ${
                showActiveFrame ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
              style={{ touchAction: 'none', cursor: 'nwse-resize' }}
              onPointerDown={(event) => beginResize('uniform', event)}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={end}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path d="M1 9L9 1M4 9H9V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}

function computeCenteredOffset(
  finalStart: number,
  finalSize: number,
  placement: NonNullable<Block['layout']>['grid'],
  gridMetrics: GridMetrics,
  axis: 'x' | 'y',
) {
  const placementRect = getPlacementRect(placement, gridMetrics)
  const containerSize = axis === 'x' ? placementRect.width : placementRect.height
  const containerStart = axis === 'x' ? placementRect.left : placementRect.top
  const centeredStart = containerStart + Math.max(0, (containerSize - finalSize) / 2)
  return finalStart - centeredStart
}

function getAlignedPositionForPlacement(
  placement: NonNullable<Block['layout']>['grid'],
  width: number,
  height: number,
  gridMetrics: GridMetrics,
) {
  const placementRect = getPlacementRect(placement, gridMetrics)
  return {
    x: Math.round(placementRect.left + Math.max(0, (placementRect.width - width) / 2)),
    y: Math.round(placementRect.top + Math.max(0, (placementRect.height - height) / 2)),
  }
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
  onUpdatePage,
}: {
  page: Page
  projectId?: string
  selectedBlockId?: string
  previewMode?: boolean
  onNavigate?: (pageId: string) => void
  onSelectBlock?: (b: Block | null) => void
  onReorder?: (newBlocks: Block[]) => void
  onUpdateBlock?: (b: Block) => void
  onUpdatePage?: (page: Page) => void
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
                dropPreviewRect={gridPreview?.blockId === block.id ? { left: gridPreview.rect.left, top: gridPreview.rect.top } : undefined}
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
