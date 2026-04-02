import { BlockRegistry } from './registry'
import type {
  Block,
  BlockGridConstraints,
  BlockRenderMetadata,
  RenderAlign,
  GridPlacement,
  GridSpan,
} from './types'

export const GRID_COLUMN_COUNT = 8
export const GRID_ROW_HEIGHT = 56
export const GRID_GAP = 0
export const GRID_PADDING = 16

export type GridMetrics = {
  columnCount?: number
  rowHeight?: number
  gap?: number
  padding?: number
  paddingX?: number
  paddingY?: number
  canvasWidth: number
}

export type GridRect = {
  left: number
  top: number
  width: number
  height: number
}

export function getBlockGridConstraints(block: Block): BlockGridConstraints {
  return BlockRegistry[block.type].gridConstraints
}

export function getColumnWidth(metrics: GridMetrics): number {
  const columnCount = metrics.columnCount ?? GRID_COLUMN_COUNT
  const gap = metrics.gap ?? GRID_GAP
  const paddingX = metrics.paddingX ?? metrics.padding ?? GRID_PADDING
  const usableWidth = Math.max(0, metrics.canvasWidth - paddingX * 2 - gap * (columnCount - 1))
  return usableWidth / columnCount
}

export function getPlacementRect(placement: GridPlacement, metrics: GridMetrics): GridRect {
  const columnWidth = getColumnWidth(metrics)
  const gap = metrics.gap ?? GRID_GAP
  const paddingX = metrics.paddingX ?? metrics.padding ?? GRID_PADDING
  const paddingY = metrics.paddingY ?? metrics.padding ?? GRID_PADDING
  const rowHeight = metrics.rowHeight ?? GRID_ROW_HEIGHT

  return {
    left: paddingX + (placement.colStart - 1) * (columnWidth + gap),
    top: paddingY + (placement.rowStart - 1) * (rowHeight + gap),
    width: placement.colSpan * columnWidth + (placement.colSpan - 1) * gap,
    height: placement.rowSpan * rowHeight + (placement.rowSpan - 1) * gap,
  }
}

export function clampSpan(span: GridSpan, constraints: BlockGridConstraints): GridSpan {
  return {
    cols: Math.max(constraints.minSpan.cols, Math.min(constraints.maxSpan.cols, span.cols)),
    rows: Math.max(constraints.minSpan.rows, Math.min(constraints.maxSpan.rows, span.rows)),
  }
}

export function quantizePixelSizeToSpan(
  size: { widthPx: number; heightPx: number },
  metrics: GridMetrics,
  constraints: BlockGridConstraints,
): GridSpan {
  const columnWidth = getColumnWidth(metrics)
  const rowHeight = metrics.rowHeight ?? GRID_ROW_HEIGHT
  const gap = metrics.gap ?? GRID_GAP

  const rawCols = Math.max(1, Math.round((size.widthPx + gap) / (columnWidth + gap)))
  const rawRows = Math.max(1, Math.round((size.heightPx + gap) / (rowHeight + gap)))

  return clampSpan({ cols: rawCols, rows: rawRows }, constraints)
}

export function normalizePlacement(
  placement: GridPlacement,
  constraints: BlockGridConstraints,
  columnCount = GRID_COLUMN_COUNT,
): GridPlacement {
  const span = clampSpan({ cols: placement.colSpan, rows: placement.rowSpan }, constraints)
  const maxColStart = Math.max(1, columnCount - span.cols + 1)

  return {
    colStart: Math.max(1, Math.min(maxColStart, placement.colStart)),
    rowStart: Math.max(1, placement.rowStart),
    colSpan: span.cols,
    rowSpan: span.rows,
  }
}

export function derivePlacementFromPixelRect(
  rect: { left: number; top: number; width: number; height: number },
  metrics: GridMetrics,
  constraints: BlockGridConstraints,
  columnCount = GRID_COLUMN_COUNT,
): GridPlacement {
  const columnWidth = getColumnWidth(metrics)
  const gap = metrics.gap ?? GRID_GAP
  const rowHeight = metrics.rowHeight ?? GRID_ROW_HEIGHT
  const paddingX = metrics.paddingX ?? metrics.padding ?? GRID_PADDING
  const paddingY = metrics.paddingY ?? metrics.padding ?? GRID_PADDING
  const span = quantizePixelSizeToSpan({ widthPx: rect.width, heightPx: rect.height }, metrics, constraints)

  const rawColStart = Math.round((rect.left - paddingX) / (columnWidth + gap)) + 1
  const rawRowStart = Math.round((rect.top - paddingY) / (rowHeight + gap)) + 1

  return normalizePlacement(
    {
      colStart: rawColStart,
      rowStart: rawRowStart,
      colSpan: span.cols,
      rowSpan: span.rows,
    },
    constraints,
    columnCount,
  )
}

export function placementsOverlap(a: GridPlacement, b: GridPlacement): boolean {
  const aColEnd = a.colStart + a.colSpan - 1
  const aRowEnd = a.rowStart + a.rowSpan - 1
  const bColEnd = b.colStart + b.colSpan - 1
  const bRowEnd = b.rowStart + b.rowSpan - 1

  const colsOverlap = a.colStart <= bColEnd && aColEnd >= b.colStart
  const rowsOverlap = a.rowStart <= bRowEnd && aRowEnd >= b.rowStart

  return colsOverlap && rowsOverlap
}

export function collidesWithBlocks(
  placement: GridPlacement,
  blocks: Block[],
  ignoreBlockId?: string,
): boolean {
  return blocks.some((block) => {
    if (block.id === ignoreBlockId) return false
    const otherPlacement = block.layout?.grid
    if (!otherPlacement) return false
    return placementsOverlap(placement, otherPlacement)
  })
}

export function findFirstAvailablePlacement(
  blocks: Block[],
  constraints: BlockGridConstraints,
  columnCount = GRID_COLUMN_COUNT,
): GridPlacement {
  const span = constraints.defaultSpan
  const maxColStart = Math.max(1, columnCount - span.cols + 1)

  for (let rowStart = 1; rowStart < 500; rowStart += 1) {
    for (let colStart = 1; colStart <= maxColStart; colStart += 1) {
      const candidate: GridPlacement = { colStart, rowStart, colSpan: span.cols, rowSpan: span.rows }
      if (!collidesWithBlocks(candidate, blocks)) return candidate
    }
  }

  return {
    colStart: 1,
    rowStart: Math.max(1, getGridRowCount(blocks) + 1),
    colSpan: span.cols,
    rowSpan: span.rows,
  }
}

export function getGridRowCount(blocks: Block[]): number {
  return blocks.reduce((maxRow, block) => {
    const placement = block.layout?.grid
    if (!placement) return maxRow
    return Math.max(maxRow, placement.rowStart + placement.rowSpan - 1)
  }, 0)
}

export function clampRenderMetadataToPlacement(
  render: BlockRenderMetadata | undefined,
  placement: GridPlacement,
  metrics: GridMetrics,
): BlockRenderMetadata {
  const placementRect = getPlacementRect(placement, metrics)
  const widthPx = render?.widthPx ? Math.min(render.widthPx, placementRect.width) : render?.widthPx
  const heightPx = render?.heightPx ? Math.min(render.heightPx, placementRect.height) : render?.heightPx
  const effectiveWidth = widthPx ?? placementRect.width
  const effectiveHeight = heightPx ?? placementRect.height
  const maxOffsetX = Math.max(0, (placementRect.width - effectiveWidth) / 2)
  const maxOffsetY = Math.max(0, (placementRect.height - effectiveHeight) / 2)

  return {
    alignX: render?.alignX ?? 'center',
    alignY: render?.alignY ?? 'center',
    widthPx,
    heightPx,
    offsetX: clampNumber(render?.offsetX, -maxOffsetX, maxOffsetX),
    offsetY: clampNumber(render?.offsetY, -maxOffsetY, maxOffsetY),
  }
}

export function resolveBlockRenderRect(
  block: Block,
  metrics: GridMetrics,
): GridRect | null {
  const placement = block.layout?.grid
  if (!placement) return null

  const placementRect = getPlacementRect(placement, metrics)
  const render = clampRenderMetadataToPlacement(block.render, placement, metrics)
  const width = render.widthPx ?? placementRect.width
  const height = render.heightPx ?? placementRect.height
  const left = placementRect.left + alignOffset(placementRect.width, width, render.alignX) + (render.offsetX ?? 0)
  const top = placementRect.top + alignOffset(placementRect.height, height, render.alignY) + (render.offsetY ?? 0)

  return {
    left,
    top,
    width,
    height,
  }
}

function clampNumber(value: number | undefined, min: number, max: number): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) return value
  return Math.max(min, Math.min(max, value))
}

function alignOffset(containerSize: number, contentSize: number, align: RenderAlign = 'center'): number {
  const freeSpace = Math.max(0, containerSize - contentSize)
  if (align === 'start') return 0
  if (align === 'end') return freeSpace
  return freeSpace / 2
}
