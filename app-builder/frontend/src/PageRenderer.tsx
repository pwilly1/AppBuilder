// © 2025 Preston Willis. All rights reserved.
import { BlockRenderer } from './shared/BlockRenderer'
import type { Page, Block } from './shared/schema/types'
import { useEffect, useRef, useState } from 'react'


// Helpers
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

type DraggableProps = {
  block: Block
  index: number
  containerRef: React.RefObject<HTMLDivElement | null>
  onSelect?: (b: Block) => void
  onUpdate?: (b: Block) => void
  onSnapChange?: (snap: { h: boolean; v: boolean }) => void
}

function DraggableBlock({ block, index, containerRef, onSelect, onUpdate, onSnapChange }: DraggableProps) {
  const elRef = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const [startPt, setStartPt] = useState<{x:number,y:number}>({ x: 0, y: 0 })
  const [startPos, setStartPos] = useState<{x:number,y:number}>({ x: block.props?.x ?? 0, y: block.props?.y ?? index * 120 })
  const [pos, setPos] = useState<{x:number,y:number}>({ x: block.props?.x ?? 0, y: block.props?.y ?? index * 120 })
  const [moved, setMoved] = useState(false)

  // keep local pos in sync if external props change (e.g., undo/redo)
  useEffect(() => {
    const x = typeof block.props?.x === 'number' ? block.props.x : pos.x
    const y = typeof block.props?.y === 'number' ? block.props.y : pos.y
    setPos({ x, y })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.props?.x, block.props?.y])

  function begin(e: React.PointerEvent) {
    const target = e.currentTarget as Element
    ;(target as any).setPointerCapture?.(e.pointerId)
    setStartPt({ x: e.clientX, y: e.clientY })
    setStartPos(pos)
    setDragging(true)
    setMoved(false)
    // reset guides when a new drag starts
    onSnapChange?.({ h: false, v: false })
  }

  function move(e: React.PointerEvent) {
    if (!dragging) return
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const el = elRef.current
    const elRect = el?.getBoundingClientRect()
    const bw = elRect?.width ?? 0
    const bh = elRect?.height ?? 0

    const dx = e.clientX - startPt.x
    const dy = e.clientY - startPt.y
    let nx = startPos.x + dx
    let ny = startPos.y + dy

    // bounds (keep inside phone frame)
    nx = clamp(nx, 0, Math.max(0, rect.width - bw))
    ny = clamp(ny, 0, Math.max(0, rect.height - bh))

    // snap assist to center lines
    const SNAP = 8
    const containerCenterX = rect.width / 2
    const containerCenterY = rect.height / 2
    const blockCenterX = nx + (bw / 2)
    const blockCenterY = ny + (bh / 2)
    const snapH = Math.abs(blockCenterX - containerCenterX) <= SNAP
    const snapV = Math.abs(blockCenterY - containerCenterY) <= SNAP
    if (snapH) {
      nx = containerCenterX - (bw / 2)
    }
    if (snapV) {
      ny = containerCenterY - (bh / 2)
    }
    onSnapChange?.({ h: snapH, v: snapV })

    setPos({ x: Math.round(nx), y: Math.round(ny) })
    if (!moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) setMoved(true)
  }

  function end(e: React.PointerEvent) {
    if (!dragging) return
    const target = e.currentTarget as Element
    ;(target as any).releasePointerCapture?.(e.pointerId)
    setDragging(false)
    // hide guides when drag ends
    onSnapChange?.({ h: false, v: false })
    // persist x/y to block props
    const updated: Block = { ...block, props: { ...block.props, x: pos.x, y: pos.y } as any }
    onUpdate?.(updated)
    // if it was just a click (no move), treat as select
    if (!moved) {
      onSelect?.(block)
    }
  }

  return (
    <div
      ref={elRef}
      className="absolute cursor-grab active:cursor-grabbing select-none"
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, zIndex: dragging ? 100 : 'auto' }}
      onPointerDown={begin}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <BlockRenderer block={block} />
    </div>
  )
}

export function PageRenderer({ page, onSelectBlock, onReorder: _onReorder, onUpdateBlock }: { page: Page; onSelectBlock?: (b: Block) => void; onReorder?: (newBlocks: Block[]) => void; onUpdateBlock?: (b: Block) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [showHGuide, setShowHGuide] = useState(false)
  const [showVGuide, setShowVGuide] = useState(false)

  return (
    <div className="mx-auto w-full flex justify-center">
      <div
        ref={containerRef}
        className="phone-frame bg-white border border-slate-100 rounded-xl p-4 shadow-sm relative"
        style={{ minHeight: 640, touchAction: 'none' }}
      >
        {/* Snap assist guides */}
        {showHGuide ? (
          <div
            className="absolute left-0 right-0 border-t border-dashed border-sky-400"
            style={{ top: '50%' }}
          />
        ) : null}
        {showVGuide ? (
          <div
            className="absolute top-0 bottom-0 border-l border-dashed border-sky-400"
            style={{ left: '50%' }}
          />
        ) : null}
        {page.blocks.map((b, i) => (
          <DraggableBlock
            key={b.id}
            block={b}
            index={i}
            containerRef={containerRef}
            onSelect={onSelectBlock}
            onUpdate={onUpdateBlock}
            onSnapChange={({ h, v }) => {
              setShowHGuide(v)
              setShowVGuide(h)
            }}
          />
        ))}
      </div>
    </div>
  )
}
