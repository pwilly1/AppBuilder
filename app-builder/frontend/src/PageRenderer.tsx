import { BlockRenderer } from './shared/BlockRenderer'
import type { Page, Block } from './shared/BlockTypes'
import {
  DndContext,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useState } from 'react'

function SortableItem({ block, onSelect, onUpdate }: { block: Block; onSelect?: (b: Block) => void; onUpdate?: (b: Block) => void }) {
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
  const style = {
    // include any live translate from dnd-kit plus an optional persisted offsetX from block props
    transform: `${CSS.Transform.toString(transform) || ''}`,
    transition,
    zIndex: isDragging ? 50 : 'auto',
  }

  // read persisted horizontal offset
  const persistedOffset = block.props?.offsetX ?? 0
  if (persistedOffset) {
    const tx = ` translateX(${persistedOffset}px)`
    style.transform = (style.transform || '') + tx
  }

  return (
    <div ref={setNodeRef} style={style}
      onPointerDown={(e) => {
        // only start drag if the pointer originated on the drag handle
        const el = (e.target as HTMLElement)
        if (el.closest && el.closest('.drag-handle')) {
          listeners?.onPointerDown?.(e as any)
        }
      }}
      onMouseDown={(e) => {
        const el = (e.target as HTMLElement)
        if (el.closest && el.closest('.drag-handle')) {
          listeners?.onMouseDown?.(e as any)
        }
      }}
    >
      <div className="relative mb-4 group" onClick={(e) => { if (isDragging) { e.stopPropagation(); return } onSelect?.(block) }}>
        {/* Drag handle - visual only; dnd-kit listeners are on the card container so touchstart is seen by react-native-web */}
        <button
          type="button"
          className="drag-handle absolute left-2 top-2 z-40 w-8 h-8 flex items-center justify-center p-1 rounded-md opacity-90 group-hover:opacity-100 pointer-events-auto"
          aria-label="Drag to reorder"
          style={{ zIndex: 80 }}
          onPointerDown={(e) => { listeners?.onPointerDown?.(e as any); }}
          onMouseDown={(e) => { listeners?.onMouseDown?.(e as any); }}
          onTouchStart={(e) => { listeners?.onTouchStart?.(e as any); }}
          onClick={(e) => { e.stopPropagation(); }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-slate-500">
            <path d="M10 6h2v2h-2V6zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2zM14 6h2v2h-2V6zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z" fill="currentColor" />
          </svg>
        </button>

        <div className="cursor-pointer">
          <BlockRenderer block={block} />
        </div>

  {/* Horizontal move handle: drag left/right to apply an X offset to the block */}
  <MoveHandle block={block} onUpdate={onUpdate} />

        {/* Action buttons removed — editing is done via the Inspector; deletion is available in the Inspector when a block is selected. */}
      </div>
    </div>
  )
}

function Gap({ index }: { index: number }) {
  const id = `gap-${index}`
  const { isOver, setNodeRef } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={`w-full h-6 my-1 rounded ${isOver ? 'bg-sky-100' : ''}`} />
  )
}

function MoveHandle({ block, onUpdate }: { block: Block; onUpdate?: (b: Block) => void }) {
  const [moving, setMoving] = useState(false)
  const [startX, setStartX] = useState(0)
  const [startOffset, setStartOffset] = useState(0)
  const [offsetX, setOffsetX] = useState<number>(block.props?.offsetX ?? 0)

  // keep offset in sync if block changes externally
  useEffect(() => { setOffsetX(block.props?.offsetX ?? 0) }, [block.props?.offsetX])

  function onPointerDown(e: any) {
    (e.target as Element).setPointerCapture?.(e.pointerId)
    setStartX(e.clientX)
    setStartOffset(offsetX)
    setMoving(true)
    e.stopPropagation()
  }

  function onPointerMove(e: any) {
    if (!moving) return
    const delta = e.clientX - startX
    setOffsetX(Math.round(startOffset + delta))
    e.stopPropagation()
  }

  function onPointerUp(e: any) {
    if (!moving) return
    (e.target as Element).releasePointerCapture?.(e.pointerId)
    setMoving(false)
    // persist offset to block props
    const updated = { ...block, props: { ...block.props, offsetX } }
    // call the lightweight update callback (doesn't open the inspector)
    onUpdate?.(updated)
    e.stopPropagation()
  }

  return (
    <button
      type="button"
      className="move-handle absolute left-10 top-2 w-8 h-8 rounded-md opacity-80 flex items-center justify-center bg-white/70"
      style={{ zIndex: 120 }}
      onPointerDown={(e) => { onPointerDown(e); }}
      onPointerMove={(e) => { onPointerMove(e); }}
      onPointerUp={(e) => { onPointerUp(e); }}
      onMouseDown={(e) => { e.stopPropagation(); }}
      onClick={(e) => { e.stopPropagation(); }}
      aria-label="Move horizontally"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-slate-600">
        <path d="M11 4l-6 6 6 6M13 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

export function PageRenderer({ page, onSelectBlock, onReorder, onUpdateBlock }: { page: Page; onSelectBlock?: (b: Block) => void; onReorder?: (newBlocks: Block[]) => void; onUpdateBlock?: (b: Block) => void }) {
  const sensors = useSensors(useSensor(PointerSensor))

  // local items state to avoid snapping back during drag — keep it in sync with incoming page.blocks
  const [items, setItems] = useState<Block[]>(page.blocks)
  // track a dragging flag so we don't clobber the local drag position with incoming props mid-drag
  const [isDragging, setIsDragging] = useState(false)
  useEffect(() => {
    if (!isDragging) setItems(page.blocks)
  }, [page.blocks, isDragging])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setIsDragging(false)
    console.log('[PageRenderer] dragEnd', { activeId: active?.id, overId: over?.id })

    // If there's a valid "over" target and it isn't the same as active, compute the final move
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(b => b.id === active.id)
      const newIndex = items.findIndex(b => b.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const next = arrayMove(items, oldIndex, newIndex)
        // update local state immediately so UI reflects the new order
        setItems(next)
        // notify parent to persist the new order in project state
        console.log('[PageRenderer] calling onReorder with new order ids:', next.map(b=>b.id))
        onReorder?.(next)
        return
      }
    }

    // Fallback: even if `over` is null or equals active, persist the current visual order
    // if it differs from the incoming page.blocks. This covers cases where collisions
    // temporarily report the active as the over target at drop but the UI was reordered
    const currentIds = items.map(b => b.id).join(',')
    const originalIds = page.blocks.map(b => b.id).join(',')
    if (currentIds !== originalIds) {
      console.log('[PageRenderer] dragEnd fallback - persisting visual order ids:', items.map(b=>b.id))
      onReorder?.(items)
    }
  }

  function handleDragOver(event: DragEndEvent) {
    const { active, over } = event
    console.log('[PageRenderer] dragOver', { activeId: active?.id, overId: over?.id })
    if (!over) return

    const oldIndex = items.findIndex(b => b.id === active.id)
    let newIndex = -1
    if (typeof over.id === 'string' && over.id.startsWith('gap-')) {
      newIndex = parseInt(over.id.replace('gap-', ''), 10)
    } else {
      newIndex = items.findIndex(b => b.id === over.id)
    }
    if (oldIndex === -1 || newIndex === -1) return
    // update local order while dragging so the UI reflects the intended position
    if (oldIndex !== newIndex) {
      setItems(prev => arrayMove(prev, oldIndex, newIndex))
    }
  }

  function handleDragStart() {
    setIsDragging(true)
  console.log('[PageRenderer] dragStart')
  }

  return (
    <div className="mx-auto w-full flex justify-center">
  <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd} onDragStart={handleDragStart} onDragOver={handleDragOver}>
        <SortableContext items={items.map(b => b.id)} strategy={verticalListSortingStrategy}>
          <div className="phone-frame bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
            {items.flatMap((b, i) => [
              <Gap key={`gap-${i}`} index={i} />,
              <SortableItem key={b.id} block={b} onSelect={onSelectBlock} onUpdate={onUpdateBlock} />
            ])}
            <Gap key={`gap-${items.length}`} index={items.length} />
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
