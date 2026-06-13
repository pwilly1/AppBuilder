import type { Block } from './types'

export function getBlockContentScale(block: Block): number {
  const layout = block.layout
  const grid = layout?.grid
  const base = layout?.scaleBase

  if (layout?.resizeBehavior !== 'scaleContent' || !grid || !base) return 1
  if (base.colSpan <= 0 || base.rowSpan <= 0) return 1

  const scaleX = grid.colSpan / base.colSpan
  const scaleY = grid.rowSpan / base.rowSpan
  const scale = Math.min(scaleX, scaleY)

  if (!Number.isFinite(scale) || scale <= 0) return 1
  return scale
}
