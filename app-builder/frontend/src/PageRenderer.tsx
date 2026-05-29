// © 2025 Preston Willis. All rights reserved.
import { BlockRenderer } from './shared/BlockRenderer'
import type { Page, Block, GridPlacement } from './shared/schema/types'
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
import { getHeroRootStyle, getHeroHeadlineStyle } from './shared/blocks/Hero'

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
const MIN_BLOCK_WIDTH = 120
const MIN_BLOCK_HEIGHT = 72
const MIN_TEXTLIKE_WIDTH = 24
const MIN_TEXTLIKE_HEIGHT = 24
const MIN_SCALE = 0.5
const MAX_SCALE = 2.6

function measureResizeContentMinWidth(root: HTMLElement | null) {
  if (!root || !document.body) return null

  const clone = root.cloneNode(true) as HTMLElement
  clone.style.position = 'fixed'
  clone.style.left = '-10000px'
  clone.style.top = '0'
  clone.style.visibility = 'hidden'
  clone.style.pointerEvents = 'none'
  clone.style.width = 'max-content'
  clone.style.maxWidth = 'none'
  clone.style.height = 'auto'

  clone.querySelectorAll<HTMLElement>('*').forEach((child) => {
    child.style.width = 'max-content'
    child.style.maxWidth = 'none'
    child.style.whiteSpace = 'pre'
  })

  document.body.appendChild(clone)
  const width = Math.ceil(clone.getBoundingClientRect().width)
  clone.remove()

  // Keep a small guard band so grid rounding does not force a last-word wrap.
  return width > 0 ? width + 12 : null
}

type ResizeMode = 'uniform' | 'horizontal' | 'vertical'
type GridPreview = {
  blockId: string
  placement: GridPlacement
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
  dropPreviewPlacement?: GridPlacement
  onSelect?: (b: Block) => void
  onUpdate?: (b: Block) => void
  onSnapChange?: (snap: { h: boolean; v: boolean }) => void
}

function InlineBlockEditor({
  block,
  width,
  onCommit,
  onCancel,
}: {
  block: Block
  width?: number
  onCommit: (props: Record<string, any>) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<Record<string, any>>(() => ({ ...(block.props as Record<string, any>) }))
  const textEditorRef = useRef<HTMLTextAreaElement | null>(null)
  const heroEditorRef = useRef<HTMLDivElement | null>(null)
  const heroHeadlineRef = useRef<HTMLDivElement | null>(null)
  const lastAcceptedHeroDraftRef = useRef<Record<string, any>>({ ...(block.props as Record<string, any>) })
  const navInputRef = useRef<HTMLInputElement | null>(null)
  const lastAcceptedNavLabelRef = useRef(String((block.props as Record<string, any>)?.label ?? 'Go'))

  useEffect(() => {
    setDraft({ ...(block.props as Record<string, any>) })
    lastAcceptedHeroDraftRef.current = { ...(block.props as Record<string, any>) }
    lastAcceptedNavLabelRef.current = String((block.props as Record<string, any>)?.label ?? 'Go')
  }, [block])

  useEffect(() => {
    if (block.type !== 'hero') return
    const frame = window.requestAnimationFrame(() => {
      const headlineNode = heroHeadlineRef.current
      if (headlineNode) headlineNode.textContent = String(lastAcceptedHeroDraftRef.current.headline ?? '')
      if (headlineNode) {
        headlineNode.focus()
        const selection = window.getSelection()
        const range = document.createRange()
        range.selectNodeContents(headlineNode)
        range.collapse(false)
        selection?.removeAllRanges()
        selection?.addRange(range)
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [block.id, block.type])

  const commit = () => onCommit(block.type === 'hero' ? lastAcceptedHeroDraftRef.current : draft)
  const handleOverlayBlur: React.FocusEventHandler<HTMLDivElement> = (event) => {
    const nextTarget = event.relatedTarget as Node | null
    if (nextTarget && event.currentTarget.contains(nextTarget)) return
    commit()
  }

  const readEditableText = (node: HTMLDivElement | null) => (node?.innerText ?? '').replace(/\r\n/g, '\n')

  const moveCaretToEnd = (node: HTMLDivElement | null) => {
    if (!node) return
    const selection = window.getSelection()
    const range = document.createRange()
    range.selectNodeContents(node)
    range.collapse(false)
    selection?.removeAllRanges()
    selection?.addRange(range)
  }

  const applyHeroDraft = (node: HTMLDivElement | null) => {
    if (!node) return

    const nextDraft = {
      ...lastAcceptedHeroDraftRef.current,
      headline: readEditableText(node),
    }

    const editor = heroEditorRef.current
    const headlineNode = heroHeadlineRef.current
    if (!editor || !headlineNode) {
      lastAcceptedHeroDraftRef.current = nextDraft
      return
    }

    const editorStyles = window.getComputedStyle(editor)
    const paddingTop = Number.parseFloat(editorStyles.paddingTop || '0') || 0
    const paddingBottom = Number.parseFloat(editorStyles.paddingBottom || '0') || 0
    const usableHeight = editor.clientHeight - paddingTop - paddingBottom
    const contentHeight = headlineNode.scrollHeight
    const fitsHeight = contentHeight <= usableHeight + 4

    if (fitsHeight) {
      lastAcceptedHeroDraftRef.current = nextDraft
      return
    }

    node.textContent = String(lastAcceptedHeroDraftRef.current.headline ?? '')
    moveCaretToEnd(node)
  }

  if (block.type === 'text') {
    return (
      <div
        className="absolute inset-0 z-[120] rounded-[1rem] bg-white/90 p-3 backdrop-blur-[1px]"
        onPointerDown={(event) => event.stopPropagation()}
        onBlur={handleOverlayBlur}
      >
        <textarea
          ref={textEditorRef}
          autoFocus
          value={String(draft.value ?? '')}
          onChange={(event) => {
            const nextValue = event.target.value
            const currentValue = String(draft.value ?? '')
            const isShrinking = nextValue.length < currentValue.length
            const fitsHeight = event.target.scrollHeight <= event.target.clientHeight + 1

            if (fitsHeight || isShrinking) {
              setDraft((current) => ({ ...current, value: nextValue }))
              return
            }

            event.target.value = currentValue
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              onCancel()
            }
          }}
          className="h-full w-full resize-none border-none bg-transparent text-slate-900 outline-none"
          style={{
            fontSize: Number(draft.fontSize ?? 16) || 16,
            lineHeight: 1.45,
            whiteSpace: 'pre-wrap',
            overflowWrap: 'break-word',
            overflowY: 'hidden',
          }}
        />
      </div>
    )
  }

  if (block.type === 'hero') {
    const heroRootStyle = getHeroRootStyle()
    const heroHeadlineStyle = getHeroHeadlineStyle(Number(lastAcceptedHeroDraftRef.current.headlineSize ?? 28) || 28)
    const heroEditCompensationPx = 4

    return (
      <div
        ref={heroEditorRef}
        className="absolute inset-0 z-[120] rounded-[1rem] bg-white/90 backdrop-blur-[1px]"
        style={heroRootStyle}
        onPointerDown={(event) => event.stopPropagation()}
        onBlur={handleOverlayBlur}
      >
        <div
          ref={heroHeadlineRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          onInput={(event) => applyHeroDraft(event.currentTarget)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              onCancel()
            }
          }}
          className="outline-none"
          style={{
            ...heroHeadlineStyle,
            background: 'transparent',
            width: `calc(100% + ${heroEditCompensationPx}px)`,
            maxWidth: `calc(100% + ${heroEditCompensationPx}px)`,
            marginRight: -heroEditCompensationPx,
          }}
        />
      </div>
    )
  }

  if (block.type === 'navButton') {
    const disabled = !(draft.toPageId as string | undefined)
    return (
      <div
        className="absolute inset-0 z-[120] flex items-start justify-start rounded-[1rem] bg-white/20 p-3"
        onPointerDown={(event) => event.stopPropagation()}
        onBlur={handleOverlayBlur}
      >
        <div
          className="rounded-[10px] px-[14px] py-[10px]"
          style={{ backgroundColor: disabled ? '#e5e7eb' : '#0f172a', maxWidth: width ? Math.max(80, width - 24) : undefined }}
        >
          <input
            ref={navInputRef}
            autoFocus
            value={String(draft.label ?? 'Go')}
            onChange={(event) => {
              const nextLabel = event.target.value
              const currentLabel = String(draft.label ?? 'Go')
              const isShrinking = nextLabel.length < currentLabel.length
              const fitsWidth = event.target.scrollWidth <= event.target.clientWidth + 1

              if (fitsWidth || isShrinking) {
                lastAcceptedNavLabelRef.current = nextLabel
                setDraft((current) => ({ ...current, label: nextLabel }))
                return
              }

              event.target.value = lastAcceptedNavLabelRef.current
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                onCancel()
              }
              if (event.key === 'Enter') {
                event.preventDefault()
                commit()
              }
            }}
            className="w-full border-none bg-transparent text-left font-semibold outline-none"
            style={{
              margin: 0,
              padding: 0,
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              color: disabled ? '#475569' : '#ffffff',
              fontSize: 14,
              minWidth: 24,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          />
        </div>
      </div>
    )
  }

  return null
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
  onSelect,
  onUpdate,
  onSnapChange,
}: DraggableProps) {
  const usesContainerResize = block.type === 'hero' || block.type === 'text' || block.type === 'navButton'
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
  const supportsInlineEdit = block.type === 'hero' || block.type === 'text' || block.type === 'navButton'

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

  function begin(e: React.PointerEvent) {
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

  function beginResize(mode: ResizeMode, e: React.PointerEvent<HTMLButtonElement>) {
    if (previewMode || inlineEditing) return
    e.stopPropagation()
    const target = e.currentTarget as Element
    ;(target as any).setPointerCapture?.(e.pointerId)
    const currentWidth = renderedWidth ?? elRef.current?.offsetWidth ?? baseSize.width ?? MIN_BLOCK_WIDTH
    const currentHeight = renderedHeight ?? elRef.current?.offsetHeight ?? baseSize.height ?? MIN_BLOCK_HEIGHT
    const contentNode = contentRef.current
    const contentRoot = contentNode?.firstElementChild as HTMLElement | null
    const resizeContentMinWidth = usesContainerResize ? measureResizeContentMinWidth(contentRoot) : null
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

  function beginInnerMove(e: React.PointerEvent<HTMLButtonElement>) {
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

  function move(e: React.PointerEvent) {
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

      if (usesContainerResize) {
        const nextWidthRaw =
          resizingMode === 'vertical' ? startBoxSize.width : startBoxSize.width + dx
        const nextHeightRaw =
          resizingMode === 'horizontal' ? startBoxSize.height : startBoxSize.height + dy
        const minWidth =
          resizingMode === 'vertical'
            ? MIN_TEXTLIKE_WIDTH
            : Math.max(MIN_TEXTLIKE_WIDTH, startContentSize.width)
        const minHeight =
          resizingMode === 'horizontal'
            ? MIN_TEXTLIKE_HEIGHT
            : Math.max(MIN_TEXTLIKE_HEIGHT, startContentSize.height)
        const maxCanvasWidth = Math.max(MIN_BLOCK_WIDTH, gridMetrics.canvasWidth - GRID_PADDING * 2)
        const maxCanvasHeight = Math.max(
          MIN_BLOCK_HEIGHT,
          (containerRef.current?.clientHeight ?? (gridMetrics.rowHeight ?? GRID_ROW_HEIGHT) * 24),
        )
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

  function end(e: React.PointerEvent) {
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
      ? startBoxSize.width || renderedWidth
      : (baseSize.width || undefined)
    : renderedWidth
      ? Math.max(1, Math.round(renderedWidth / Math.max(scaleX, 0.001)))
      : undefined
  const contentHeight = usesContainerResize ? renderedHeight : undefined
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
            display: usesContainerResize ? 'flex' : undefined,
            flexDirection: usesContainerResize ? 'column' : undefined,
            alignItems: usesContainerResize ? 'flex-start' : undefined,
            transform: usesContainerResize ? undefined : `scale(${scaleX}, ${scaleY})`,
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

function computeCenteredOffset(
  finalStart: number,
  finalSize: number,
  placement: GridPlacement,
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
  placement: GridPlacement,
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
