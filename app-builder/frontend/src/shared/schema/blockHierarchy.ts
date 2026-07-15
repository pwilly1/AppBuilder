import { BlockRegistry, isSupportedBlockType } from './registry'
import {
  GRID_COLUMN_COUNT,
  GRID_DEFAULT_ROW_COUNT,
  findFirstAvailablePlacement,
  normalizePlacement,
  placementsOverlap,
} from './gridLayout'
import type { Block, BlockType, GridPlacement, GridSpan } from './types'

export const CONTAINER_BLOCK_TYPE: BlockType = 'container'
export const FORM_BLOCK_TYPE: BlockType = 'form'

export const CONTAINER_CHILD_BLOCK_TYPES = [
  'text',
  'hero',
  'button',
  'shape',
  'badge',
  'icon',
  'input',
  'textarea',
  'image',
  'checkbox',
  'toggle',
  'progressBar',
  'dataList',
] as const satisfies readonly BlockType[]

export const FORM_CHILD_BLOCK_TYPES = [
  'input',
  'textarea',
  'checkbox',
  'toggle',
] as const satisfies readonly BlockType[]

const CONTAINER_CHILD_TYPE_SET = new Set<BlockType>(CONTAINER_CHILD_BLOCK_TYPES)
const FORM_CHILD_TYPE_SET = new Set<BlockType>(FORM_CHILD_BLOCK_TYPES)

export type BlockHierarchyIndex = {
  byId: Map<string, Block>
  topLevel: Block[]
  childrenByParentId: Map<string, Block[]>
}

export type HierarchyIssueCode =
  | 'missing-parent'
  | 'parent-not-container'
  | 'nested-container'
  | 'unsupported-child-type'
  | 'missing-grid'
  | 'child-out-of-bounds'
  | 'sibling-collision'

export type HierarchyIssue = {
  code: HierarchyIssueCode
  blockId: string
  parentId?: string
}

export type HierarchyRepairResult = {
  blocks: Block[]
  issues: HierarchyIssue[]
}

export function isContainerBlock(block: Block): boolean {
  return block.type === CONTAINER_BLOCK_TYPE || block.type === FORM_BLOCK_TYPE
}

export function canBlockTypeBeContainerChild(type: BlockType, parentType: BlockType = CONTAINER_BLOCK_TYPE): boolean {
  if (parentType === FORM_BLOCK_TYPE) return FORM_CHILD_TYPE_SET.has(type)
  return CONTAINER_CHILD_TYPE_SET.has(type)
}

export function canBlockBeContainerChild(block: Block, parent?: Block): boolean {
  return canBlockTypeBeContainerChild(block.type, parent?.type ?? CONTAINER_BLOCK_TYPE)
}

export function buildBlockHierarchyIndex(blocks: Block[]): BlockHierarchyIndex {
  const byId = new Map<string, Block>()
  const topLevel: Block[] = []
  const childrenByParentId = new Map<string, Block[]>()

  for (const block of blocks) {
    byId.set(block.id, block)
  }

  for (const block of blocks) {
    if (!block.parentId) {
      topLevel.push(block)
      continue
    }

    const children = childrenByParentId.get(block.parentId) ?? []
    children.push(block)
    childrenByParentId.set(block.parentId, children)
  }

  return { byId, topLevel, childrenByParentId }
}

export function getContainerChildren(blocks: Block[], containerId: string): Block[] {
  return buildBlockHierarchyIndex(blocks).childrenByParentId.get(containerId) ?? []
}

export function isPlacementWithinSpan(placement: GridPlacement, span: GridSpan): boolean {
  return (
    placement.colStart >= 1 &&
    placement.rowStart >= 1 &&
    placement.colStart + placement.colSpan - 1 <= span.cols &&
    placement.rowStart + placement.rowSpan - 1 <= span.rows
  )
}

export function isPlacementWithinPlacement(placement: GridPlacement, parentPlacement: GridPlacement): boolean {
  return isPlacementWithinSpan(placement, { cols: parentPlacement.colSpan, rows: parentPlacement.rowSpan })
}

export function pageToContainerPlacement(pagePlacement: GridPlacement, containerPlacement: GridPlacement): GridPlacement {
  return {
    ...pagePlacement,
    colStart: pagePlacement.colStart - containerPlacement.colStart + 1,
    rowStart: pagePlacement.rowStart - containerPlacement.rowStart + 1,
  }
}

export function containerToPagePlacement(relativePlacement: GridPlacement, containerPlacement: GridPlacement): GridPlacement {
  return {
    ...relativePlacement,
    colStart: containerPlacement.colStart + relativePlacement.colStart - 1,
    rowStart: containerPlacement.rowStart + relativePlacement.rowStart - 1,
  }
}

export function getEffectivePagePlacement(block: Block, blocks: Block[]): GridPlacement | null {
  const placement = block.layout?.grid
  if (!placement) return null
  if (!block.parentId) return placement

  const parent = blocks.find((candidate) => candidate.id === block.parentId)
  const parentPlacement = parent?.layout?.grid
  if (!parentPlacement) return placement

  return containerToPagePlacement(placement, parentPlacement)
}

export function placementsCollideInScope(
  candidate: GridPlacement,
  blocks: Block[],
  parentId?: string,
  ignoreBlockId?: string,
): boolean {
  return blocks.some((block) => {
    if (block.id === ignoreBlockId) return false
    if ((block.parentId ?? undefined) !== parentId) return false
    const placement = block.layout?.grid
    if (!placement) return false
    return placementsOverlap(candidate, placement)
  })
}

export function validateBlockHierarchy(blocks: Block[]): HierarchyIssue[] {
  const issues: HierarchyIssue[] = []
  const index = buildBlockHierarchyIndex(blocks)

  for (const block of blocks) {
    if (!block.parentId) continue

    const parent = index.byId.get(block.parentId)
    if (!parent) {
      issues.push({ code: 'missing-parent', blockId: block.id, parentId: block.parentId })
      continue
    }

    if (!isContainerBlock(parent)) {
      issues.push({ code: 'parent-not-container', blockId: block.id, parentId: block.parentId })
      continue
    }

    if (isContainerBlock(block)) {
      issues.push({ code: 'nested-container', blockId: block.id, parentId: block.parentId })
      continue
    }

    if (!canBlockBeContainerChild(block, parent)) {
      issues.push({ code: 'unsupported-child-type', blockId: block.id, parentId: block.parentId })
      continue
    }

    if (!block.layout?.grid || !parent.layout?.grid) {
      issues.push({ code: 'missing-grid', blockId: block.id, parentId: block.parentId })
      continue
    }

    if (!isPlacementWithinPlacement(block.layout.grid, parent.layout.grid)) {
      issues.push({ code: 'child-out-of-bounds', blockId: block.id, parentId: block.parentId })
    }
  }

  for (const [parentId, children] of index.childrenByParentId.entries()) {
    for (let outer = 0; outer < children.length; outer += 1) {
      for (let inner = outer + 1; inner < children.length; inner += 1) {
        const a = children[outer]
        const b = children[inner]
        if (!a.layout?.grid || !b.layout?.grid) continue
        if (!placementsOverlap(a.layout.grid, b.layout.grid)) continue
        issues.push({ code: 'sibling-collision', blockId: b.id, parentId })
      }
    }
  }

  return issues
}

export function repairBlockHierarchy(
  blocks: Block[],
  options: { columnCount?: number; rowCount?: number } = {},
): HierarchyRepairResult {
  const columnCount = options.columnCount ?? GRID_COLUMN_COUNT
  const rowCount = options.rowCount ?? GRID_DEFAULT_ROW_COUNT
  const issues = validateBlockHierarchy(blocks)
  if (!issues.length) return { blocks, issues }

  const detachIds = new Set(issues.map((issue) => issue.blockId))
  const repaired = blocks.map((block) => {
    if (!detachIds.has(block.id)) return { ...block }

    const next: Block = {
      ...block,
      parentId: undefined,
      layout: {
        ...(block.layout || {}),
      },
    }

    return next
  })

  const placedTopLevel: Block[] = []
  const nextBlocks: Block[] = []

  for (const block of repaired) {
    if (block.parentId) {
      nextBlocks.push(block)
      continue
    }

    const constraints = getSafeGridConstraints(block)
    const grid = block.layout?.grid
    let nextBlock = block

    if (!grid || detachIds.has(block.id)) {
      nextBlock = {
        ...block,
        layout: {
          ...(block.layout || {}),
          grid: findFirstAvailablePlacement(placedTopLevel, constraints, columnCount, rowCount),
        },
      }
    } else {
      nextBlock = {
        ...block,
        layout: {
          ...(block.layout || {}),
          grid: normalizePlacement(grid, constraints, columnCount, rowCount),
        },
      }
    }

    placedTopLevel.push(nextBlock)
    nextBlocks.push(nextBlock)
  }

  return { blocks: nextBlocks, issues }
}

export function attachBlockToContainer(block: Block, container: Block): Block {
  const blockPlacement = requireGridPlacement(block)
  const containerPlacement = requireGridPlacement(container)

  return {
    ...block,
    parentId: container.id,
    layout: {
      ...(block.layout || {}),
      grid: pageToContainerPlacement(blockPlacement, containerPlacement),
    },
  }
}

export function detachBlockFromContainer(block: Block, container: Block): Block {
  const blockPlacement = requireGridPlacement(block)
  const containerPlacement = requireGridPlacement(container)

  return {
    ...block,
    parentId: undefined,
    layout: {
      ...(block.layout || {}),
      grid: containerToPagePlacement(blockPlacement, containerPlacement),
    },
  }
}

export function getProportionalChildPlacement(
  childPlacement: GridPlacement,
  oldContainerPlacement: GridPlacement,
  newContainerPlacement: GridPlacement,
): GridPlacement {
  return {
    colStart: Math.round(((childPlacement.colStart - 1) / oldContainerPlacement.colSpan) * newContainerPlacement.colSpan) + 1,
    rowStart: Math.round(((childPlacement.rowStart - 1) / oldContainerPlacement.rowSpan) * newContainerPlacement.rowSpan) + 1,
    colSpan: Math.max(1, Math.round((childPlacement.colSpan / oldContainerPlacement.colSpan) * newContainerPlacement.colSpan)),
    rowSpan: Math.max(1, Math.round((childPlacement.rowSpan / oldContainerPlacement.rowSpan) * newContainerPlacement.rowSpan)),
  }
}

export function getProportionalChildPlacements(
  children: Block[],
  oldContainerPlacement: GridPlacement,
  newContainerPlacement: GridPlacement,
): Map<string, GridPlacement> {
  const placements = new Map<string, GridPlacement>()

  for (const child of children) {
    if (!child.layout?.grid) continue
    const constraints = getSafeGridConstraints(child)
    const proposed = getProportionalChildPlacement(child.layout.grid, oldContainerPlacement, newContainerPlacement)
    placements.set(
      child.id,
      normalizePlacement(proposed, constraints, newContainerPlacement.colSpan, newContainerPlacement.rowSpan),
    )
  }

  return placements
}

export function validateContainerResize(
  children: Block[],
  oldContainerPlacement: GridPlacement,
  newContainerPlacement: GridPlacement,
): { valid: boolean; placements: Map<string, GridPlacement>; issues: HierarchyIssue[] } {
  const placements = getProportionalChildPlacements(children, oldContainerPlacement, newContainerPlacement)
  const issues: HierarchyIssue[] = []
  const proposedChildren = children.map((child) => ({
    ...child,
    layout: {
      ...(child.layout || {}),
      grid: placements.get(child.id) ?? child.layout?.grid,
    },
  }))

  for (const child of proposedChildren) {
    if (!child.layout?.grid) {
      issues.push({ code: 'missing-grid', blockId: child.id, parentId: child.parentId })
      continue
    }

    if (!isPlacementWithinPlacement(child.layout.grid, newContainerPlacement)) {
      issues.push({ code: 'child-out-of-bounds', blockId: child.id, parentId: child.parentId })
    }
  }

  for (let outer = 0; outer < proposedChildren.length; outer += 1) {
    for (let inner = outer + 1; inner < proposedChildren.length; inner += 1) {
      const a = proposedChildren[outer]
      const b = proposedChildren[inner]
      if (!a.layout?.grid || !b.layout?.grid) continue
      if (!placementsOverlap(a.layout.grid, b.layout.grid)) continue
      issues.push({ code: 'sibling-collision', blockId: b.id, parentId: b.parentId })
    }
  }

  return { valid: issues.length === 0, placements, issues }
}

function requireGridPlacement(block: Block): GridPlacement {
  const placement = block.layout?.grid
  if (!placement) throw new Error(`Block ${block.id} is missing grid placement`)
  return placement
}

function getSafeGridConstraints(block: Block) {
  if (isSupportedBlockType(block.type)) return BlockRegistry[block.type].gridConstraints
  return {
    defaultSpan: { cols: 1, rows: 1 },
    minSpan: { cols: 1, rows: 1 },
    maxSpan: { cols: GRID_COLUMN_COUNT, rows: GRID_DEFAULT_ROW_COUNT },
  }
}
