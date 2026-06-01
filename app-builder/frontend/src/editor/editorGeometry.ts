import type { GridPlacement } from '../shared/schema/types'
import { getPlacementRect, type GridMetrics } from '../shared/schema/gridLayout'

export const MIN_BLOCK_WIDTH = 120
export const MIN_BLOCK_HEIGHT = 72
export const MIN_TEXTLIKE_WIDTH = 24
export const MIN_TEXTLIKE_HEIGHT = 24
export const MIN_SCALE = 0.5
export const MAX_SCALE = 2.6

export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

export function measureResizeContentMinWidth(root: HTMLElement | null) {
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

export function computeCenteredOffset(
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

export function getAlignedPositionForPlacement(
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
