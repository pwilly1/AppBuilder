import { placementsOverlap } from '../shared/schema/gridLayout'
import { isPlacementWithinSpan } from '../shared/schema/blockHierarchy'
import type { Block, GridPlacement, GridSpan } from '../shared/schema/types'

// Grow in place, smallest extra area first. Never move siblings or shrink the current box.
export function findFontPlacement(
  block: Block,
  siblings: Block[],
  span: GridSpan,
  fits: (placement: GridPlacement) => boolean,
): GridPlacement | null {
  const grid = block.layout?.grid
  if (!grid) return null
  const candidates: GridPlacement[] = []
  for (let cols = grid.colSpan; cols <= span.cols - grid.colStart + 1; cols++) {
    for (let rows = grid.rowSpan; rows <= span.rows - grid.rowStart + 1; rows++) {
      candidates.push({ ...grid, colSpan: cols, rowSpan: rows })
    }
  }
  candidates.sort((a, b) => a.colSpan * a.rowSpan - b.colSpan * b.rowSpan || a.colSpan - b.colSpan)
  return candidates.find((candidate) =>
    isPlacementWithinSpan(candidate, span)
    && !siblings.some((other) => other.id !== block.id && other.parentId === block.parentId
      && other.layout?.grid && placementsOverlap(candidate, other.layout.grid))
    && fits(candidate),
  ) ?? null
}
