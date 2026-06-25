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
import { buildBlockHierarchyIndex, isContainerBlock } from '../shared/schema/blockHierarchy'

const PREVIEW_WIDTH = 390

export function Preview({ blocks }: { blocks: Block[] }) {
  const hierarchy = buildBlockHierarchyIndex(blocks)
  const topLevelBlocks = blocks.filter((block) => {
    if (!block.parentId) return true
    const parent = hierarchy.byId.get(block.parentId)
    return !parent || !isContainerBlock(parent)
  })
  const gridRowCount = getGridRowCount(topLevelBlocks)
  const gridHeight = gridRowCount * GRID_ROW_HEIGHT + Math.max(0, gridRowCount - 1) * GRID_GAP
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
        {topLevelBlocks.map((block, index) => {
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
                <BlockRenderer block={block} previewMode>
                  {isContainerBlock(block) ? renderContainerChildren(block, blocks, gridMetrics) : null}
                </BlockRenderer>
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

function renderContainerChildren(
  container: Block,
  blocks: Block[],
  parentGridMetrics: typeof gridMetricsShape,
) {
  const containerPlacement = container.layout?.grid
  if (!containerPlacement) return null

  const children = blocks.filter((block) => block.parentId === container.id)
  if (!children.length) return null

  const containerRect = resolveBlockRenderRect(container, parentGridMetrics)
  if (!containerRect) return null

  const childGridMetrics = {
    ...parentGridMetrics,
    canvasWidth: containerRect.width,
    columnCount: containerPlacement.colSpan,
    paddingX: 0,
    paddingY: 0,
  }

  return children.map((child) => {
    const childRect = resolveBlockRenderRect(child, childGridMetrics)
    if (!childRect) return null

    return (
      <div
        key={child.id}
        style={{
          position: 'absolute',
          left: childRect.left,
          top: childRect.top,
          width: childRect.width,
          height: childRect.height,
        }}
      >
        <BlockRenderer block={child} previewMode />
      </div>
    )
  })
}

const gridMetricsShape = {
  canvasWidth: PREVIEW_WIDTH,
  columnCount: GRID_COLUMN_COUNT,
  rowHeight: GRID_ROW_HEIGHT,
  gap: GRID_GAP,
  paddingX: GRID_PADDING,
  paddingY: GRID_PADDING,
}
