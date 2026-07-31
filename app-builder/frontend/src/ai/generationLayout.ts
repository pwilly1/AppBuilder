import {
  GRID_COLUMN_COUNT,
  GRID_DEFAULT_ROW_COUNT,
  collidesWithBlocks,
  getBlockGridConstraints,
  getScopedGridConstraints,
  normalizePlacement,
} from '../shared/schema/gridLayout'
import {
  getChildOwnerSpan,
  validateBlockHierarchy,
} from '../shared/schema/blockHierarchy'
import type { Block, GridPlacement } from '../shared/schema/types'
import type { AiGenerationPlanIssue } from './aiTypes'

export type AiGenerationLayoutRepair = {
  pageKey: string
  blockKey: string
  reason: 'clamped-to-grid' | 'moved-to-free-space'
  from: GridPlacement
  to: GridPlacement
}

export type AiGenerationLayoutResult = {
  blocks: Block[]
  repairs: AiGenerationLayoutRepair[]
  issues: AiGenerationPlanIssue[]
}

export function normalizeGeneratedPageLayout(
  pageKey: string,
  blocks: Block[],
  blockKeyById: ReadonlyMap<string, string>,
): AiGenerationLayoutResult {
  const repairs: AiGenerationLayoutRepair[] = []
  const issues: AiGenerationPlanIssue[] = []
  const processed: Block[] = []
  const processedById = new Map<string, Block>()
  const ordered = [
    ...blocks.filter((block) => !block.parentId),
    ...blocks.filter((block) => block.parentId),
  ]

  for (const original of ordered) {
    const proposed = original.layout?.grid
    const blockKey = blockKeyById.get(original.id) ?? original.id
    if (!proposed) {
      issues.push({
        code: 'missing-grid',
        path: `pages.${pageKey}.blocks.${blockKey}.grid`,
        message: 'Generated blocks require an exact grid placement.',
      })
      processed.push(original)
      processedById.set(original.id, original)
      continue
    }

    const parent = original.parentId ? processedById.get(original.parentId) : undefined
    if (original.parentId && !parent) {
      issues.push({
        code: 'missing-parent',
        path: `pages.${pageKey}.blocks.${blockKey}.parentKey`,
        message: 'The referenced parent block was not created before its child.',
      })
    }

    const ownerSpan = parent
      ? getChildOwnerSpan(parent)
      : { cols: GRID_COLUMN_COUNT, rows: GRID_DEFAULT_ROW_COUNT }
    const constraints = getScopedGridConstraints(
      {
        ...getBlockGridConstraints(original),
        defaultSpan: {
          cols: proposed.colSpan,
          rows: proposed.rowSpan,
        },
      },
      ownerSpan.cols,
      ownerSpan.rows,
    )
    const bounded = normalizePlacement(
      proposed,
      constraints,
      ownerSpan.cols,
      ownerSpan.rows,
    )

    if (!placementsEqual(proposed, bounded)) {
      repairs.push({
        pageKey,
        blockKey,
        reason: 'clamped-to-grid',
        from: proposed,
        to: bounded,
      })
    }

    const siblings = processed.filter(
      (candidate) => (candidate.parentId ?? undefined) === (original.parentId ?? undefined),
    )
    let placement = bounded
    if (collidesWithBlocks(placement, siblings)) {
      const available = findNearestAvailablePlacement(
        placement,
        siblings,
        constraints,
        ownerSpan.cols,
        ownerSpan.rows,
      )
      if (!available) {
        issues.push({
          code: 'layout-full',
          path: `pages.${pageKey}.blocks.${blockKey}.grid`,
          message: 'No collision-free grid placement is available for this block.',
        })
      } else {
        repairs.push({
          pageKey,
          blockKey,
          reason: 'moved-to-free-space',
          from: placement,
          to: available,
        })
        placement = available
      }
    }

    const next: Block = {
      ...original,
      layout: {
        ...(original.layout || {}),
        grid: placement,
      },
    }
    processed.push(next)
    processedById.set(next.id, next)
  }

  const finalById = new Map(processed.map((block) => [block.id, block]))
  const finalBlocks = blocks.map((block) => finalById.get(block.id) ?? block)
  for (const issue of validateBlockHierarchy(finalBlocks)) {
    const blockKey = blockKeyById.get(issue.blockId) ?? issue.blockId
    issues.push({
      code: issue.code,
      path: `pages.${pageKey}.blocks.${blockKey}`,
      message: describeHierarchyIssue(issue.code),
    })
  }

  return { blocks: finalBlocks, repairs, issues }
}

function findNearestAvailablePlacement(
  requested: GridPlacement,
  siblings: Block[],
  constraints: ReturnType<typeof getScopedGridConstraints>,
  columnCount: number,
  rowCount: number,
): GridPlacement | null {
  const normalized = normalizePlacement(requested, constraints, columnCount, rowCount)
  const maxColStart = Math.max(1, columnCount - normalized.colSpan + 1)
  const maxRowStart = Math.max(1, rowCount - normalized.rowSpan + 1)
  const candidates: GridPlacement[] = []

  for (let rowStart = 1; rowStart <= maxRowStart; rowStart += 1) {
    for (let colStart = 1; colStart <= maxColStart; colStart += 1) {
      candidates.push({
        colStart,
        rowStart,
        colSpan: normalized.colSpan,
        rowSpan: normalized.rowSpan,
      })
    }
  }

  candidates.sort((left, right) => {
    const leftDistance = Math.abs(left.colStart - normalized.colStart)
      + Math.abs(left.rowStart - normalized.rowStart)
    const rightDistance = Math.abs(right.colStart - normalized.colStart)
      + Math.abs(right.rowStart - normalized.rowStart)
    if (leftDistance !== rightDistance) return leftDistance - rightDistance
    if (left.rowStart !== right.rowStart) return left.rowStart - right.rowStart
    return left.colStart - right.colStart
  })

  return candidates.find((candidate) => !collidesWithBlocks(candidate, siblings)) ?? null
}

function placementsEqual(left: GridPlacement, right: GridPlacement): boolean {
  return left.colStart === right.colStart
    && left.rowStart === right.rowStart
    && left.colSpan === right.colSpan
    && left.rowSpan === right.rowSpan
}

function describeHierarchyIssue(code: string): string {
  if (code === 'missing-parent') return 'The generated child references a missing parent.'
  if (code === 'parent-not-container') return 'The generated parent cannot own child blocks.'
  if (code === 'nested-container') return 'Nested child-owning blocks are not supported.'
  if (code === 'unsupported-child-type') return 'This block type is not supported inside its parent.'
  if (code === 'missing-grid') return 'The generated block is missing grid placement.'
  if (code === 'child-out-of-bounds') return 'The generated child does not fit inside its parent.'
  return 'Generated sibling blocks overlap.'
}
