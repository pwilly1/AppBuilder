import { useEffect, useMemo, useRef, useState, type PointerEvent, type RefObject } from 'react'
import { BlockRenderer } from '../shared/BlockRenderer'
import type { Block, GridPlacement } from '../shared/schema/types'
import {
  clampRenderMetadataToPlacement,
  getPlacementRect,
  type GridMetrics,
  GRID_ROW_HEIGHT,
  resolveBlockRenderRect,
} from '../shared/schema/gridLayout'
import { getBlockEditorPlacement } from '../shared/schema/runtimeLayout'
import { InlineBlockEditor } from './InlineBlockEditor'
import {
  clamp,
  computeCenteredOffset,
  getAlignedPositionForPlacement,
  MAX_SCALE,
  measureResizeContentMinWidth,
  MIN_BLOCK_HEIGHT,
  MIN_BLOCK_WIDTH,
  MIN_SCALE,
  MIN_TEXTLIKE_HEIGHT,
  MIN_TEXTLIKE_WIDTH,
} from './editorGeometry'

type ResizeMode = 'uniform' | 'horizontal' | 'vertical'
type SaveBlockOptions = {
  usePreviewRect?: boolean
}

type DraggableProps = {
  block: Block
  isActive?: boolean
  projectId?: string
  index: number
  containerRef: RefObject<HTMLDivElement | null>
  gridMetrics: GridMetrics
  previewMode?: boolean
  onNavigate?: (pageId: string) => void
  onDragStateChange?: (dragging: boolean) => void
  onGridPreviewChange?: (preview: { blockId: string; left: number; top: number; width: number; height: number } | null) => void
  dropPreviewValid?: boolean
  dropPreviewPlacement?: GridPlacement
  onSelect?: (b: Block) => void
  onUpdate?: (b: Block) => void
  onSnapChange?: (snap: { h: boolean; v: boolean }) => void
}

export function DraggableBlock({
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
  onSelect,
  onUpdate,
  onSnapChange,
}: DraggableProps) {
  const supportsInlineEdit = block.type === 'hero' || block.type === 'text' || block.type === 'navButton'
  const usesContainerResize =
    supportsInlineEdit ||
    block.type === 'shape' ||
    block.type === 'divider' ||
    block.type === 'spacer' ||
    block.type === 'input' ||
    block.type === 'textarea'
  const scalesContentWithBox = supportsInlineEdit && block.layout?.resizeBehavior === 'scaleContent'
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
  const [startBoxSize, setStartBoxSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })
  const [startContentSize, setStartContentSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: placement.x, y: placement.y })
  const [startScale, setStartScale] = useState<{ x: number; y: number }>({ x: placement.scaleX, y: placement.scaleY })
  const [scaleX, setScaleX] = useState<number>(placement.scaleX)
  const [scaleY, setScaleY] = useState<number>(placement.scaleY)
  const [baseSize, setBaseSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })
  const [renderSize, setRenderSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })
  const [moved, setMoved] = useState(false)
  const [inlineEditing, setInlineEditing] = useState(false)
  const resolvedRect = useMemo(() => resolveBlockRenderRect(block, gridMetrics), [block, gridMetrics])

  useEffect(() => {
    if (dragging || resizingMode || innerMoving) return

    const fallbackPlacement = getBlockEditorPlacement(block, index)

    if (resolvedRect) {
      setPos({ x: Math.round(resolvedRect.left), y: Math.round(resolvedRect.top) })
      if (usesContainerResize) {
        setScaleX(1)
        setScaleY(1)
      } else if (baseSize.width > 0 && baseSize.height > 0) {
        setScaleX(Number((resolvedRect.width / baseSize.width).toFixed(3)))
        setScaleY(Number((resolvedRect.height / baseSize.height).toFixed(3)))
      } else {
        setScaleX(fallbackPlacement.scaleX)
        setScaleY(fallbackPlacement.scaleY)
      }
      return
    }

    setPos({ x: fallbackPlacement.x, y: fallbackPlacement.y })
    setScaleX(usesContainerResize ? 1 : fallbackPlacement.scaleX)
    setScaleY(usesContainerResize ? 1 : fallbackPlacement.scaleY)
  }, [resolvedRect, block, index, baseSize.width, baseSize.height, dragging, resizingMode, innerMoving, usesContainerResize])

  useEffect(() => {
    const node = contentRef.current
    if (!node || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver((entries) => {
      if (usesContainerResize && resizingMode) return

      const entry = entries[0]
      if (!entry) return
      const minWidth = usesContainerResize ? MIN_TEXTLIKE_WIDTH : MIN_BLOCK_WIDTH
      const minHeight = usesContainerResize ? MIN_TEXTLIKE_HEIGHT : MIN_BLOCK_HEIGHT
      const nextWidth = Math.max(minWidth, Math.round(entry.contentRect.width))
      const nextHeight = Math.max(minHeight, Math.round(entry.contentRect.height))
      setBaseSize((current) => {
        if (current.width === nextWidth && current.height === nextHeight) return current
        return { width: nextWidth, height: nextHeight }
      })
    })

    observer.observe(node)
    return () => observer.disconnect()
  }, [usesContainerResize, resizingMode])

  useEffect(() => {
    const node = contentRef.current
    if (!node) return

    const updateRenderSize = () => {
      const rect = node.getBoundingClientRect()
      const minWidth = usesContainerResize ? MIN_TEXTLIKE_WIDTH : MIN_BLOCK_WIDTH
      const minHeight = usesContainerResize ? MIN_TEXTLIKE_HEIGHT : MIN_BLOCK_HEIGHT
      const nextWidth = Math.max(minWidth, Math.round(rect.width))
      const nextHeight = Math.max(minHeight, Math.round(rect.height))
      setRenderSize((current) => {
        if (current.width === nextWidth && current.height === nextHeight) return current
        return { width: nextWidth, height: nextHeight }
      })
    }

    const frame = window.requestAnimationFrame(updateRenderSize)
    return () => window.cancelAnimationFrame(frame)
  }, [baseSize.width, baseSize.height, scaleX, scaleY, block.id, block.props, block.render])

  function begin(e: PointerEvent) {
    if (previewMode || inlineEditing) return
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

  function beginResize(mode: ResizeMode, e: PointerEvent<HTMLButtonElement>) {
    if (previewMode || inlineEditing) return
    e.stopPropagation()
    const target = e.currentTarget as Element
    ;(target as any).setPointerCapture?.(e.pointerId)
    const currentWidth = renderedWidth ?? elRef.current?.offsetWidth ?? baseSize.width ?? MIN_BLOCK_WIDTH
    const currentHeight = renderedHeight ?? elRef.current?.offsetHeight ?? baseSize.height ?? MIN_BLOCK_HEIGHT
    const contentNode = contentRef.current
    const contentRoot = contentNode?.firstElementChild as HTMLElement | null
    const resizeContentMinWidth = supportsInlineEdit && !scalesContentWithBox ? measureResizeContentMinWidth(contentRoot) : null
    const contentWidth = Math.ceil(
      resizeContentMinWidth ??
        contentRoot?.getBoundingClientRect().width ??
        contentNode?.scrollWidth ??
        currentWidth,
    )
    const contentHeight = Math.ceil(
      contentRoot?.getBoundingClientRect().height ??
        contentNode?.scrollHeight ??
        currentHeight,
    )
    setStartPt({ x: e.clientX, y: e.clientY })
    setStartScale({ x: scaleX, y: scaleY })
    setStartBoxSize({ width: currentWidth, height: currentHeight })
    setStartContentSize({ width: contentWidth, height: contentHeight })
    setResizingMode(mode)
    onDragStateChange?.(true)
    const width = currentWidth
    const height = currentHeight
    onGridPreviewChange?.({ blockId: block.id, left: pos.x, top: pos.y, width, height })
    setMoved(true)
    onSelect?.(block)
  }

  function beginInnerMove(e: PointerEvent<HTMLButtonElement>) {
    if (previewMode || inlineEditing || !block.layout?.grid) return
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

  function move(e: PointerEvent) {
    if (previewMode || inlineEditing) return

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
      const container = containerRef.current
      const containerWidth = container?.clientWidth ?? gridMetrics.canvasWidth
      const containerHeight = container?.clientHeight ?? (gridMetrics.rowHeight ?? GRID_ROW_HEIGHT) * 24
      const maxResizeWidth = Math.max(MIN_BLOCK_WIDTH, containerWidth - pos.x)
      const maxResizeHeight = Math.max(MIN_BLOCK_HEIGHT, containerHeight - pos.y)

      if (usesContainerResize) {
        const nextWidthRaw =
          resizingMode === 'vertical' ? startBoxSize.width : startBoxSize.width + dx
        const nextHeightRaw =
          resizingMode === 'horizontal' ? startBoxSize.height : startBoxSize.height + dy
        const minWidth =
          resizingMode === 'vertical' || scalesContentWithBox || !supportsInlineEdit
            ? MIN_TEXTLIKE_WIDTH
            : Math.max(MIN_TEXTLIKE_WIDTH, startContentSize.width)
        const minHeight =
          resizingMode === 'horizontal' || scalesContentWithBox || !supportsInlineEdit
            ? MIN_TEXTLIKE_HEIGHT
            : Math.max(MIN_TEXTLIKE_HEIGHT, startContentSize.height)
        const maxCanvasWidth = Math.max(minWidth, maxResizeWidth)
        const maxCanvasHeight = Math.max(minHeight, maxResizeHeight)
        const nextWidth = clamp(nextWidthRaw, minWidth, maxCanvasWidth)
        const nextHeight = clamp(nextHeightRaw, minHeight, maxCanvasHeight)

        const nextScaleX = startBoxSize.width > 0 ? nextWidth / startBoxSize.width : 1
        const nextScaleY = startBoxSize.height > 0 ? nextHeight / startBoxSize.height : 1
        setScaleX(Number(nextScaleX.toFixed(3)))
        setScaleY(Number(nextScaleY.toFixed(3)))
        onGridPreviewChange?.({
          blockId: block.id,
          left: pos.x,
          top: pos.y,
          width: Math.round(nextWidth),
          height: Math.round(nextHeight),
        })
        return
      }

      if (resizingMode === 'horizontal') {
        const nextWidth = clamp(baseWidth * startScale.x + dx, baseWidth * MIN_SCALE, Math.min(baseWidth * MAX_SCALE, maxResizeWidth))
        const nextScaleX = nextWidth / baseWidth
        setScaleX(Number(nextScaleX.toFixed(3)))
        onGridPreviewChange?.({
          blockId: block.id,
          left: pos.x,
          top: pos.y,
          width: Math.round(nextWidth),
          height: renderedHeight ?? Math.round(baseHeight * scaleY),
        })
        return
      }

      if (resizingMode === 'vertical') {
        const nextHeight = clamp(baseHeight * startScale.y + dy, baseHeight * MIN_SCALE, Math.min(baseHeight * MAX_SCALE, maxResizeHeight))
        const nextScaleY = nextHeight / baseHeight
        setScaleY(Number(nextScaleY.toFixed(3)))
        onGridPreviewChange?.({
          blockId: block.id,
          left: pos.x,
          top: pos.y,
          width: renderedWidth ?? Math.round(baseWidth * scaleX),
          height: Math.round(nextHeight),
        })
        return
      }

      const nextWidth = clamp(baseWidth * startScale.x + dx, baseWidth * MIN_SCALE, Math.min(baseWidth * MAX_SCALE, maxResizeWidth))
      const nextHeight = clamp(baseHeight * startScale.y + dy, baseHeight * MIN_SCALE, Math.min(baseHeight * MAX_SCALE, maxResizeHeight))
      const nextScaleX = nextWidth / baseWidth
      const nextScaleY = nextHeight / baseHeight
      setScaleX(Number(nextScaleX.toFixed(3)))
      setScaleY(Number(nextScaleY.toFixed(3)))
      onGridPreviewChange?.({
        blockId: block.id,
        left: pos.x,
        top: pos.y,
        width: Math.round(nextWidth),
        height: Math.round(nextHeight),
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
    const finalWidth = usesContainerResize
      ? (renderedWidth ? Math.round(renderedWidth) : baseSize.width ? Math.round(baseSize.width * nextScaleX) : renderedWidth)
      : (baseSize.width ? Math.round(baseSize.width * nextScaleX) : renderedWidth)
    const finalHeight = usesContainerResize
      ? (renderedHeight ? Math.round(renderedHeight) : baseSize.height ? Math.round(baseSize.height * nextScaleY) : renderedHeight)
      : (baseSize.height ? Math.round(baseSize.height * nextScaleY) : renderedHeight)
    const nextGrid = dropPreviewPlacement ?? block.layout?.grid
    const snappedGridRect = resizingMode && usePreviewRect && nextGrid ? getPlacementRect(nextGrid, gridMetrics) : null
    const renderWidth = snappedGridRect ? Math.round(snappedGridRect.width) : finalWidth
    const renderHeight = snappedGridRect ? Math.round(snappedGridRect.height) : finalHeight
    const alignedPreviewPos =
      usePreviewRect && nextGrid && renderWidth && renderHeight
        ? getAlignedPositionForPlacement(nextGrid, renderWidth, renderHeight, gridMetrics)
        : null
    const finalX = snappedGridRect ? Math.round(snappedGridRect.left) : alignedPreviewPos ? alignedPreviewPos.x : pos.x
    const finalY = snappedGridRect ? Math.round(snappedGridRect.top) : alignedPreviewPos ? alignedPreviewPos.y : pos.y
    const currentProps = (block.props || {}) as Record<string, any>
    const {
      width: _oldWidth,
      height: _oldHeight,
      x: _oldX,
      y: _oldY,
      scale: _oldScale,
      scaleX: _oldScaleX,
      scaleY: _oldScaleY,
      ...rest
    } = currentProps
    const nextRender =
      snappedGridRect
        ? {
            ...(block.render || {}),
            alignX: 'center' as const,
            alignY: 'center' as const,
            widthPx: renderWidth,
            heightPx: renderHeight,
            offsetX: 0,
            offsetY: 0,
          }
        : nextGrid && renderWidth && renderHeight
        ? clampRenderMetadataToPlacement(
            {
              ...(block.render || {}),
              widthPx: renderWidth,
              heightPx: renderHeight,
              offsetX: computeCenteredOffset(finalX, renderWidth, nextGrid, gridMetrics, 'x'),
              offsetY: computeCenteredOffset(finalY, renderHeight, nextGrid, gridMetrics, 'y'),
            },
            nextGrid,
            gridMetrics,
          )
        : {
            ...(block.render || {}),
            widthPx: renderWidth,
            heightPx: renderHeight,
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
      props: { ...rest } as any,
      editorPlacement: {
        x: finalX,
        y: finalY,
        scaleX: usesContainerResize ? 1 : nextScaleX,
        scaleY: usesContainerResize ? 1 : nextScaleY,
      },
    })
  }

  function end(e: PointerEvent) {
    if (previewMode || inlineEditing) return

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
        const placementRect = getPlacementRect(dropPreviewPlacement, gridMetrics)
        setPos({ x: Math.round(placementRect.left), y: Math.round(placementRect.top) })
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
    ? usesContainerResize
      ? Math.round(startBoxSize.width * scaleX)
      : (baseSize.width ? Math.round(baseSize.width * scaleX) : liveWidth)
    : resolvedRect?.width
      ? Math.round(resolvedRect.width)
      : liveWidth
  const renderedHeight = resizingMode
    ? usesContainerResize
      ? Math.round(startBoxSize.height * scaleY)
      : (baseSize.height ? Math.round(baseSize.height * scaleY) : liveHeight)
    : resolvedRect?.height
      ? Math.round(resolvedRect.height)
      : liveHeight
  const contentWidth = resizingMode
    ? usesContainerResize
      ? scalesContentWithBox
        ? renderedWidth
        : startBoxSize.width || renderedWidth
      : (baseSize.width || undefined)
    : renderedWidth
      ? Math.max(1, Math.round(renderedWidth / Math.max(scaleX, 0.001)))
      : undefined
  const contentHeight = usesContainerResize ? renderedHeight : undefined
  const renderedBlock =
    scalesContentWithBox && resizingMode && dropPreviewPlacement
      ? {
          ...block,
          layout: {
            ...(block.layout || {}),
            grid: dropPreviewPlacement,
          },
        }
      : block
  const showActiveFrame = Boolean(isActive || inlineEditing || dragging || resizingMode || innerMoving)
  const inlineEditorVisible = !previewMode && inlineEditing && supportsInlineEdit

  function commitInlineEdit(nextProps: Record<string, any>) {
    const normalizedProps =
      block.type === 'hero'
        ? {
            headlineSize: Number(nextProps.headlineSize ?? (block.props as Record<string, any>)?.headlineSize ?? 28) || 28,
            ...nextProps,
          }
        : nextProps

    onUpdate?.({
      ...block,
      props: { ...(block.props as Record<string, any>), ...normalizedProps },
    })
    setInlineEditing(false)
  }

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
      onDoubleClick={
        previewMode || !supportsInlineEdit
          ? undefined
          : (event) => {
              event.stopPropagation()
              setInlineEditing(true)
              onSelect?.(block)
            }
      }
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
            height: contentHeight,
            visibility: inlineEditorVisible ? 'hidden' : undefined,
            display: usesContainerResize ? 'flex' : undefined,
            flexDirection: usesContainerResize ? 'column' : undefined,
            alignItems: usesContainerResize ? 'flex-start' : undefined,
            transform: usesContainerResize ? undefined : `scale(${scaleX}, ${scaleY})`,
            transformOrigin: 'top left',
          }}
        >
          <BlockRenderer
            block={renderedBlock}
            projectId={projectId}
            previewMode={previewMode}
            onNavigate={previewMode ? onNavigate : undefined}
          />
        </div>

        {inlineEditorVisible ? (
          <InlineBlockEditor
            block={block}
            width={renderedWidth}
            onCommit={commitInlineEdit}
            onCancel={() => setInlineEditing(false)}
          />
        ) : null}

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


