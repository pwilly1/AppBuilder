import {
  collidesWithBlocks,
  getBlockGridConstraints,
  getPlacementRect,
  GRID_COLUMN_COUNT,
  GRID_GAP,
  GRID_PADDING,
  GRID_ROW_HEIGHT,
  type GridMetrics,
} from './gridLayout'
import type { Block } from './types'

const CONTENT_METRICS: GridMetrics = {
  canvasWidth: 390,
  columnCount: GRID_COLUMN_COUNT,
  rowHeight: GRID_ROW_HEIGHT,
  gap: GRID_GAP,
  paddingX: GRID_PADDING,
  paddingY: GRID_PADDING,
}

type AutoGrowResult = {
  block: Block
  error?: string
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function countWrappedLines(text: string, widthPx: number, fontSize: number): number {
  const normalized = text.replace(/\r/g, '')
  const paragraphs = normalized.split('\n')
  const avgCharWidth = Math.max(5, fontSize * 0.52)
  const usableWidth = Math.max(40, widthPx)

  return paragraphs.reduce((total, paragraph) => {
    const content = paragraph.length ? paragraph : ' '
    const estimatedWidth = content.length * avgCharWidth
    return total + Math.max(1, Math.ceil(estimatedWidth / usableWidth))
  }, 0)
}

function estimateTextHeight(block: Block, widthPx: number): number {
  const fontSize = Math.max(12, Number((block.props as any)?.fontSize) || 16)
  const lineHeight = Math.round(fontSize * 1.4)
  const contentWidth = Math.max(40, widthPx - 24)
  const lines = countWrappedLines(normalizeText((block.props as any)?.value), contentWidth, fontSize)
  return Math.max(56, 24 + lines * lineHeight)
}

function estimateServicesHeight(block: Block, widthPx: number): number {
  const title = normalizeText((block.props as any)?.title)
  const items = Array.isArray((block.props as any)?.items) ? (block.props as any).items : []
  const contentWidth = Math.max(60, widthPx - 32)
  let total = 32

  if (title) {
    total += 34
    total += 12
  }

  for (const item of items) {
    const name = normalizeText(item?.name)
    const description = normalizeText(item?.description)
    const price = normalizeText(item?.price)
    const bodyWidth = Math.max(48, contentWidth - (price ? 72 : 0))
    const descLines = description ? countWrappedLines(description, bodyWidth, 14) : 0

    total += 28
    total += name ? 20 : 0
    total += description ? 6 + descLines * 20 : 0
    total += 28
    total += 12
  }

  return Math.max(72, total)
}

function estimateContactFormHeight(block: Block, widthPx: number): number {
  const title = normalizeText((block.props as any)?.title)
  const subtitle = normalizeText((block.props as any)?.subtitle)
  const successMessage = normalizeText((block.props as any)?.successMessage)
  const showName = Boolean((block.props as any)?.showName)
  const showEmail = Boolean((block.props as any)?.showEmail)
  const showPhone = Boolean((block.props as any)?.showPhone)
  const showMessage = Boolean((block.props as any)?.showMessage)
  const contentWidth = Math.max(80, widthPx - 32)

  let total = 32

  if (title) total += 32
  if (subtitle) {
    const subtitleLines = countWrappedLines(subtitle, contentWidth, 14)
    total += 6 + subtitleLines * 20
  }

  if (showName) total += 70
  if (showEmail) total += 70
  if (showPhone) total += 70
  if (showMessage) total += 144

  total += 14
  total += 48

  if (successMessage) {
    const successLines = countWrappedLines(successMessage, contentWidth, 13)
    total += 10 + successLines * 18
  }

  total += 28
  return Math.max(120, total)
}

function estimateRequiredHeight(block: Block, widthPx: number): number {
  switch (block.type) {
    case 'text':
      return estimateTextHeight(block, widthPx)
    case 'servicesList':
      return estimateServicesHeight(block, widthPx)
    case 'contactForm':
      return estimateContactFormHeight(block, widthPx)
    default:
      return 0
  }
}

export function applyContentAutoGrowth(updated: Block, siblings: Block[]): AutoGrowResult {
  const placement = updated.layout?.grid
  if (!placement) return { block: updated }

  const constraints = getBlockGridConstraints(updated)
  if (!constraints.allowAutoGrowRows) return { block: updated }

  const placementRect = getPlacementRect(placement, CONTENT_METRICS)
  const renderWidth = Math.min(updated.render?.widthPx ?? placementRect.width, placementRect.width)
  const requiredHeight = estimateRequiredHeight(updated, renderWidth)

  if (!requiredHeight) return { block: updated }
  const neededRows = Math.ceil((requiredHeight + GRID_GAP) / (GRID_ROW_HEIGHT + GRID_GAP))
  const nextRowSpan = Math.max(
    constraints.minSpan.rows,
    Math.min(constraints.maxSpan.rows, neededRows),
  )

  if (neededRows > constraints.maxSpan.rows) {
    return {
      block: updated,
      error: 'This block needs more space than its current size rules allow. Resize or rearrange it first.',
    }
  }

  const grownPlacement = {
    ...placement,
    rowSpan: nextRowSpan,
  }

  if (nextRowSpan > placement.rowSpan && collidesWithBlocks(grownPlacement, siblings, updated.id)) {
    return {
      block: updated,
      error: 'This block needs more vertical space. Move nearby blocks or resize this block before saving.',
    }
  }

  const grownRect = getPlacementRect(grownPlacement, CONTENT_METRICS)
  const nextHeightPx = Math.min(requiredHeight, grownRect.height)

  if (nextRowSpan === placement.rowSpan && (updated.render?.heightPx ?? grownRect.height) === nextHeightPx) {
    return { block: updated }
  }

  return {
    block: {
      ...updated,
      layout: {
        ...(updated.layout || {}),
        grid: grownPlacement,
      },
      render: {
        ...(updated.render || {}),
        alignX: updated.render?.alignX ?? 'center',
        alignY: updated.render?.alignY ?? 'center',
        heightPx: nextHeightPx,
      },
    },
  }
}
