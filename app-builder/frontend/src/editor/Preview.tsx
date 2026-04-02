import { BlockRenderer } from '../shared/BlockRenderer'
import type { Block } from '../shared/schema/types'
import {
  getGridRowCount,
  GRID_COLUMN_COUNT,
  GRID_GAP,
  GRID_PADDING,
  GRID_ROW_HEIGHT,
  resolveBlockRenderRect,
} from '../shared/schema/gridLayout'
import { getBlockEditorPlacement } from '../shared/schema/runtimeLayout'

const PREVIEW_WIDTH = 390

export function Preview({ blocks }: { blocks: Block[] }) {
  const gridHeight = getGridRowCount(blocks) * GRID_ROW_HEIGHT + Math.max(0, getGridRowCount(blocks) - 1) * GRID_GAP
  const minHeight = Math.max(640, gridHeight + GRID_PADDING * 2)
  const gridMetrics = {
    canvasWidth: PREVIEW_WIDTH,
    columnCount: GRID_COLUMN_COUNT,
    rowHeight: GRID_ROW_HEIGHT,
    gap: GRID_GAP,
    paddingX: GRID_PADDING,
    paddingY: GRID_PADDING,
  }

  return (
    <div style={{ width: PREVIEW_WIDTH, margin: '0 auto', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
      <div style={{ position: 'relative', minHeight }}>
        {blocks.map((block, index) => {
          const resolvedRect = resolveBlockRenderRect(block, gridMetrics)
          if (resolvedRect) {
            return (
              <div
                key={block.id}
                style={{
                  position: 'absolute',
                  left: resolvedRect.left,
                  top: resolvedRect.top,
                  width: resolvedRect.width,
                  height: resolvedRect.height,
                }}
              >
                <BlockRenderer block={block} previewMode />
              </div>
            )
          }

          const legacy = getBlockEditorPlacement(block, index)
          return (
            <div
              key={block.id}
              style={{
                position: 'absolute',
                transform: `translate(${legacy.x}px, ${legacy.y}px)`,
              }}
            >
              <div style={{ transform: `scale(${legacy.scaleX}, ${legacy.scaleY})`, transformOrigin: 'top left', width: 'max-content' }}>
                <BlockRenderer block={block} previewMode />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
