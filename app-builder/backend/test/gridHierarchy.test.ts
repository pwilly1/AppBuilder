import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clampRenderMetadataToPlacement,
  collidesWithBlocks,
  derivePlacementFromPixelRect,
  findFirstAvailablePlacement,
  getColumnWidth,
  getPlacementRect,
  normalizePlacement,
  placementsOverlap,
  quantizePixelSizeToSpan,
} from '../../frontend/src/shared/schema/gridLayout.js'
import {
  attachBlockToContainer,
  buildBlockHierarchyIndex,
  detachBlockFromContainer,
  pageToContainerPlacement,
  repairBlockHierarchy,
  validateBlockHierarchy,
  validateContainerResize,
} from '../../frontend/src/shared/schema/blockHierarchy.js'
import type { Block, BlockGridConstraints, GridPlacement } from '../../frontend/src/shared/schema/types.js'

const constraints: BlockGridConstraints = {
  defaultSpan: { cols: 2, rows: 1 },
  minSpan: { cols: 1, rows: 1 },
  maxSpan: { cols: 4, rows: 4 },
}

const metrics = {
  canvasWidth: 340,
  columnCount: 4,
  rowHeight: 20,
  gap: 4,
  padding: 10,
}

function block(id: string, type: Block['type'], grid: GridPlacement, parentId?: string): Block {
  return { id, type, ...(parentId ? { parentId } : {}), props: {}, layout: { grid } }
}

test('grid metrics produce exact padded placement rectangles', () => {
  assert.equal(getColumnWidth(metrics), 77)
  assert.deepEqual(getPlacementRect({ colStart: 2, rowStart: 2, colSpan: 2, rowSpan: 3 }, metrics), {
    left: 91,
    top: 34,
    width: 158,
    height: 68,
  })
})

test('pixel sizes and positions quantize back to bounded grid placements', () => {
  assert.deepEqual(quantizePixelSizeToSpan({ widthPx: 158, heightPx: 68 }, metrics, constraints), {
    cols: 2,
    rows: 3,
  })
  assert.deepEqual(
    derivePlacementFromPixelRect({ left: 91, top: 34, width: 158, height: 68 }, metrics, constraints, 4, 4),
    { colStart: 2, rowStart: 2, colSpan: 2, rowSpan: 3 },
  )
  assert.deepEqual(normalizePlacement({ colStart: 4, rowStart: 9, colSpan: 3, rowSpan: 3 }, constraints, 4, 10), {
    colStart: 2,
    rowStart: 8,
    colSpan: 3,
    rowSpan: 3,
  })
})

test('collision checks distinguish overlap from touching edges', () => {
  const left = { colStart: 1, rowStart: 1, colSpan: 2, rowSpan: 2 }
  const touching = { colStart: 3, rowStart: 1, colSpan: 2, rowSpan: 2 }
  const overlapping = { colStart: 2, rowStart: 2, colSpan: 2, rowSpan: 2 }

  assert.equal(placementsOverlap(left, touching), false)
  assert.equal(placementsOverlap(left, overlapping), true)
  assert.equal(collidesWithBlocks(overlapping, [block('existing', 'text', left)]), true)
  assert.equal(collidesWithBlocks(overlapping, [block('existing', 'text', left)], 'existing'), false)
})

test('first available placement scans rows deterministically', () => {
  const occupied = [
    block('first', 'text', { colStart: 1, rowStart: 1, colSpan: 2, rowSpan: 1 }),
  ]

  assert.deepEqual(findFirstAvailablePlacement(occupied, constraints, 4, 3), {
    colStart: 3,
    rowStart: 1,
    colSpan: 2,
    rowSpan: 1,
  })
})

test('render metadata cannot exceed or drift outside occupied grid cells', () => {
  const placement = { colStart: 1, rowStart: 1, colSpan: 2, rowSpan: 2 }
  const render = clampRenderMetadataToPlacement(
    { widthPx: 200, heightPx: 50, offsetX: 40, offsetY: -30 },
    placement,
    { canvasWidth: 160, columnCount: 4, rowHeight: 20 },
  )

  assert.equal(render.alignX, 'center')
  assert.equal(render.alignY, 'center')
  assert.equal(render.widthPx, 80)
  assert.equal(render.heightPx, 40)
  assert.equal(Math.abs(render.offsetX ?? 0), 0)
  assert.equal(Math.abs(render.offsetY ?? 0), 0)
})

test('attaching and detaching a child preserves its effective page placement', () => {
  const container = block('container-1', 'container', { colStart: 3, rowStart: 4, colSpan: 8, rowSpan: 6 })
  const child = block('text-1', 'text', { colStart: 5, rowStart: 6, colSpan: 2, rowSpan: 2 })

  assert.deepEqual(pageToContainerPlacement(child.layout!.grid!, container.layout!.grid!), {
    colStart: 3,
    rowStart: 3,
    colSpan: 2,
    rowSpan: 2,
  })

  const attached = attachBlockToContainer(child, container)
  assert.equal(attached.parentId, container.id)
  assert.deepEqual(detachBlockFromContainer(attached, container).layout?.grid, child.layout?.grid)
})

test('hierarchy validation detects invalid parents, child types, bounds, and collisions', () => {
  const container = block('container-1', 'container', { colStart: 1, rowStart: 1, colSpan: 4, rowSpan: 4 })
  const childA = block('child-a', 'text', { colStart: 1, rowStart: 1, colSpan: 2, rowSpan: 2 }, container.id)
  const childB = block('child-b', 'button', { colStart: 2, rowStart: 2, colSpan: 2, rowSpan: 2 }, container.id)
  const outOfBounds = block('outside', 'text', { colStart: 4, rowStart: 4, colSpan: 2, rowSpan: 2 }, container.id)
  const nested = block('nested', 'container', { colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1 }, container.id)
  const orphan = block('orphan', 'text', { colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1 }, 'missing')

  const issues = validateBlockHierarchy([container, childA, childB, outOfBounds, nested, orphan])
  assert.equal(issues.some((issue) => issue.code === 'sibling-collision' && issue.blockId === childB.id), true)
  assert.equal(issues.some((issue) => issue.code === 'child-out-of-bounds' && issue.blockId === outOfBounds.id), true)
  assert.equal(issues.some((issue) => issue.code === 'nested-container' && issue.blockId === nested.id), true)
  assert.equal(issues.some((issue) => issue.code === 'missing-parent' && issue.blockId === orphan.id), true)
})

test('hierarchy repair detaches invalid children and rebuilds a consistent index', () => {
  const container = block('container-1', 'container', { colStart: 1, rowStart: 1, colSpan: 4, rowSpan: 4 })
  const orphan = block('orphan', 'text', { colStart: 1, rowStart: 1, colSpan: 2, rowSpan: 1 }, 'missing')
  const repaired = repairBlockHierarchy([container, orphan], { columnCount: 16, rowCount: 29 })
  const repairedOrphan = repaired.blocks.find((candidate) => candidate.id === orphan.id)

  assert.equal(repaired.issues.some((issue) => issue.code === 'missing-parent'), true)
  assert.equal(repairedOrphan?.parentId, undefined)
  assert.equal(validateBlockHierarchy(repaired.blocks).length, 0)
  assert.equal(buildBlockHierarchyIndex(repaired.blocks).topLevel.length, 2)
})

test('container resize rejects proportional child collisions', () => {
  const children = [
    block('left', 'text', { colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 2 }, 'container-1'),
    block('right', 'text', { colStart: 2, rowStart: 1, colSpan: 1, rowSpan: 2 }, 'container-1'),
  ]
  const result = validateContainerResize(
    children,
    { colStart: 1, rowStart: 1, colSpan: 8, rowSpan: 4 },
    { colStart: 1, rowStart: 1, colSpan: 2, rowSpan: 2 },
  )

  assert.equal(result.valid, false)
  assert.equal(result.issues.some((issue) => issue.code === 'sibling-collision'), true)
})
