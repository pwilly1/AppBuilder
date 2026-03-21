// © 2025 Preston Willis. All rights reserved.
import { BlockRenderer } from './shared/BlockRenderer'
import type { Page, Block } from './shared/schema/types'
import { useEffect, useRef, useState } from 'react'

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
const MIN_BLOCK_WIDTH = 120
const MIN_BLOCK_HEIGHT = 72
const MIN_SCALE = 0.5
const MAX_SCALE = 2.6

type ResizeMode = 'uniform' | 'horizontal' | 'vertical'

type DraggableProps = {
  block: Block
  isActive?: boolean
  projectId?: string
  index: number
  containerRef: React.RefObject<HTMLDivElement | null>
  previewMode?: boolean
  onNavigate?: (pageId: string) => void
  onSelect?: (b: Block) => void
  onUpdate?: (b: Block) => void
  onSnapChange?: (snap: { h: boolean; v: boolean }) => void
}

function DraggableBlock({ block, isActive, projectId, index, containerRef, previewMode, onNavigate, onSelect, onUpdate, onSnapChange }: DraggableProps) {
  const elRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const cornerResizeHandleRef = useRef<HTMLButtonElement | null>(null)
  const horizontalResizeHandleRef = useRef<HTMLButtonElement | null>(null)
  const verticalResizeHandleRef = useRef<HTMLButtonElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const [resizingMode, setResizingMode] = useState<ResizeMode | null>(null)
  const [startPt, setStartPt] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [startPos, setStartPos] = useState<{ x: number; y: number }>({ x: block.props?.x ?? 0, y: block.props?.y ?? index * 120 })
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: block.props?.x ?? 0, y: block.props?.y ?? index * 120 })
  const initialScaleX = typeof block.props?.scaleX === 'number' ? block.props.scaleX : typeof block.props?.scale === 'number' ? block.props.scale : 1
  const initialScaleY = typeof block.props?.scaleY === 'number' ? block.props.scaleY : typeof block.props?.scale === 'number' ? block.props.scale : 1
  const [startScale, setStartScale] = useState<{ x: number; y: number }>({ x: initialScaleX, y: initialScaleY })
  const [scaleX, setScaleX] = useState<number>(initialScaleX)
  const [scaleY, setScaleY] = useState<number>(initialScaleY)
  const [baseSize, setBaseSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })
  const [moved, setMoved] = useState(false)

  useEffect(() => {
    const x = typeof block.props?.x === 'number' ? block.props.x : 0
    const y = typeof block.props?.y === 'number' ? block.props.y : index * 120
    setPos({ x, y })
  }, [block.props?.x, block.props?.y, index])

  useEffect(() => {
    const nextScaleX = typeof block.props?.scaleX === 'number' ? block.props.scaleX : typeof block.props?.scale === 'number' ? block.props.scale : 1
    const nextScaleY = typeof block.props?.scaleY === 'number' ? block.props.scaleY : typeof block.props?.scale === 'number' ? block.props.scale : 1
    setScaleX(nextScaleX)
    setScaleY(nextScaleY)
  }, [block.props?.scale, block.props?.scaleX, block.props?.scaleY])

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

  function begin(e: React.PointerEvent) {
    if (previewMode) return
    const targetNode = e.target as Node
    if (cornerResizeHandleRef.current?.contains(targetNode) || horizontalResizeHandleRef.current?.contains(targetNode) || verticalResizeHandleRef.current?.contains(targetNode)) return
    const target = e.currentTarget as Element
    ;(target as any).setPointerCapture?.(e.pointerId)
    setStartPt({ x: e.clientX, y: e.clientY })
    setStartPos(pos)
    setDragging(true)
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
    setMoved(true)
    onSelect?.(block)
  }

  function move(e: React.PointerEvent) {
    if (previewMode) return

    if (resizingMode) {
      const dx = e.clientX - startPt.x
      const dy = e.clientY - startPt.y
      const baseWidth = Math.max(baseSize.width || MIN_BLOCK_WIDTH, MIN_BLOCK_WIDTH)
      const baseHeight = Math.max(baseSize.height || MIN_BLOCK_HEIGHT, MIN_BLOCK_HEIGHT)

      if (resizingMode === 'horizontal') {
        const nextScaleX = clamp((baseWidth * startScale.x + dx) / baseWidth, MIN_SCALE, MAX_SCALE)
        setScaleX(Number(nextScaleX.toFixed(3)))
        return
      }

      if (resizingMode === 'vertical') {
        const nextScaleY = clamp((baseHeight * startScale.y + dy) / baseHeight, MIN_SCALE, MAX_SCALE)
        setScaleY(Number(nextScaleY.toFixed(3)))
        return
      }

      const nextScaleX = clamp((baseWidth * startScale.x + dx) / baseWidth, MIN_SCALE, MAX_SCALE)
      const nextScaleY = clamp((baseHeight * startScale.y + dy) / baseHeight, MIN_SCALE, MAX_SCALE)
      setScaleX(Number(nextScaleX.toFixed(3)))
      setScaleY(Number(nextScaleY.toFixed(3)))
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
    if (!moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) setMoved(true)
  }

  function saveBlock(nextScaleX = scaleX, nextScaleY = scaleY) {
    const currentProps = (block.props || {}) as Record<string, any>
    const { width: _oldWidth, height: _oldHeight, scale: _oldScale, ...rest } = currentProps
    onUpdate?.({
      ...block,
      props: { ...rest, x: pos.x, y: pos.y, scaleX: nextScaleX, scaleY: nextScaleY } as any,
    })
  }

  function end(e: React.PointerEvent) {
    if (previewMode) return

    if (resizingMode) {
      const target = e.target as Element
      ;(target as any).releasePointerCapture?.(e.pointerId)
      setResizingMode(null)
      saveBlock(scaleX, scaleY)
      return
    }

    if (!dragging) return
    const target = e.currentTarget as Element
    ;(target as any).releasePointerCapture?.(e.pointerId)
    setDragging(false)
    onSnapChange?.({ h: false, v: false })
    saveBlock(scaleX, scaleY)
    if (!moved) onSelect?.(block)
  }

  const renderedWidth = baseSize.width ? Math.round(baseSize.width * scaleX) : undefined
  const renderedHeight = baseSize.height ? Math.round(baseSize.height * scaleY) : undefined
  const showActiveFrame = Boolean(isActive || dragging || resizingMode)

  return (
    <div
      ref={elRef}
      className={previewMode ? 'absolute select-none' : 'absolute select-none'}
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
            width: 'max-content',
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
                    onSelectBlock?.(null)
                  }
            }
          >
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
                previewMode={previewMode}
                onNavigate={onNavigate}
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

