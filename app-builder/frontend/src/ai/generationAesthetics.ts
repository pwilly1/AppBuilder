import type {
  AiGenerationPlanIssue,
  AiPagePlan,
  AiPageSectionPlan,
  AiGenerationSectionPattern,
} from '@apptura/shared/ai'
import {
  GRID_COLUMN_COUNT,
  GRID_DEFAULT_ROW_COUNT,
  getBlockGridConstraints,
  placementsOverlap,
} from '../shared/schema/gridLayout'
import { getChildOwnerSpan } from '../shared/schema/blockHierarchy'
import type { Block, GridPlacement } from '../shared/schema/types'
import { getGeneratedContentMinimumSpan } from './generationLayout'
import { resolveGeneratedVisualRole } from './generationTheme'

export type AiGenerationCompositionRepair = {
  pageKey: string
  sectionKey: string
  blockKey: string
  reason:
    | 'centered-section'
    | 'aligned-section-edges'
    | 'normalized-section-spacing'
    | 'balanced-split'
    | 'balanced-actions'
  from: GridPlacement
  to: GridPlacement
}

export type AiGenerationVisualIssue = {
  code: string
  severity: 'warning' | 'severe'
  pageKey: string
  sectionKey?: string
  blockKeys: string[]
  message: string
}

export type AiGenerationCompositionResult = {
  blocks: Block[]
  repairs: AiGenerationCompositionRepair[]
  warnings: AiGenerationVisualIssue[]
  issues: AiGenerationPlanIssue[]
}

type SectionMembers = {
  section: AiPageSectionPlan
  blocks: Block[]
  ownerId?: string
}

type RowBand = {
  blockIds: string[]
  start: number
  end: number
}

type CompositionMode = 'comfortable' | 'compact' | 'dense'

export function normalizeGeneratedPageComposition(
  page: AiPagePlan,
  blocks: Block[],
  blockKeyById: ReadonlyMap<string, string>,
): AiGenerationCompositionResult {
  if (!page.sections?.length) {
    return { blocks, repairs: [], warnings: [], issues: [] }
  }

  const normalizedPage: AiPagePlan = {
    ...page,
    sections: normalizeCompositionSections(page, blocks, blockKeyById),
  }
  let nextBlocks = blocks
  const repairs: AiGenerationCompositionRepair[] = []

  const composed = proposeWholePagePlacements(normalizedPage, nextBlocks, blockKeyById)
  if (
    composed
    && canApplyPlacements(nextBlocks.filter((block) => composed.has(block.id)), composed, nextBlocks)
  ) {
    const applied = applyPlacements(nextBlocks, composed)
    repairs.push(...describeSpacingRepairs(
      page.key,
      nextBlocks,
      applied,
      blockKeyById,
      normalizedPage.sections ?? [],
    ))
    nextBlocks = applied
  }

  for (const section of normalizedPage.sections ?? []) {
    let members = resolveSectionMembers(section, nextBlocks, blockKeyById)
    if (!members.blocks.length) continue

    const horizontal = proposeSectionHorizontalPlacements(
      normalizedPage,
      members,
      nextBlocks,
      blockKeyById,
    )
    if (
      placementsChanged(members.blocks, horizontal)
      && canApplyPlacements(members.blocks, horizontal, nextBlocks)
    ) {
      const applied = applyPlacements(nextBlocks, horizontal)
      repairs.push(...describeRepairs(page.key, members, nextBlocks, applied, blockKeyById))
      nextBlocks = applied
    }

    members = resolveSectionMembers(section, nextBlocks, blockKeyById)
    const vertical = proposeSectionSpacingPlacements(normalizedPage, members)
    if (
      placementsChanged(members.blocks, vertical)
      && canApplyPlacements(members.blocks, vertical, nextBlocks)
    ) {
      const applied = applyPlacements(nextBlocks, vertical)
      repairs.push(...describeRepairs(page.key, members, nextBlocks, applied, blockKeyById))
      nextBlocks = applied
    }
  }

  const sectionSpacing = proposeInterSectionSpacing(normalizedPage, nextBlocks, blockKeyById)
  if (sectionSpacing.size && canApplyPlacements(
    nextBlocks.filter((block) => sectionSpacing.has(block.id)),
    sectionSpacing,
    nextBlocks,
  )) {
    const applied = applyPlacements(nextBlocks, sectionSpacing)
    repairs.push(...describeSpacingRepairs(
      page.key,
      nextBlocks,
      applied,
      blockKeyById,
      normalizedPage.sections ?? [],
    ))
    nextBlocks = applied
  }

  const visualIssues = analyzeGeneratedPageComposition(normalizedPage, nextBlocks, blockKeyById)
  return {
    blocks: nextBlocks,
    repairs,
    // Composition quality is reviewable, not a project-integrity boundary.
    // Keep every unresolved concern visible without rejecting an otherwise
    // valid, collision-free proposal.
    warnings: visualIssues,
    issues: [],
  }
}

function normalizeCompositionSections(
  page: AiPagePlan,
  blocks: Block[],
  blockKeyById: ReadonlyMap<string, string>,
): AiPageSectionPlan[] {
  const blocksByKey = new Map(blocks.map((block) => [blockKeyById.get(block.id) ?? block.id, block]))
  const assigned = new Set<string>()
  const sections: AiPageSectionPlan[] = []

  for (const section of page.sections ?? []) {
    const keysByOwner = new Map<string, string[]>()
    for (const blockKey of section.blockKeys) {
      const block = blocksByKey.get(blockKey)
      if (!block || assigned.has(blockKey)) continue
      assigned.add(blockKey)
      const ownerKey = block.parentId ?? '__page__'
      keysByOwner.set(ownerKey, [...(keysByOwner.get(ownerKey) ?? []), blockKey])
    }
    let ownerIndex = 0
    for (const blockKeys of keysByOwner.values()) {
      sections.push({
        ...section,
        key: ownerIndex === 0 ? section.key : `${section.key}-${ownerIndex + 1}`,
        blockKeys,
      })
      ownerIndex += 1
    }
  }

  const inferredByOwner = new Map<string, { pattern: AiGenerationSectionPattern; keys: string[] }[]>()
  for (const block of blocks) {
    const blockKey = blockKeyById.get(block.id) ?? block.id
    if (assigned.has(blockKey)) continue
    const ownerKey = block.parentId ?? '__page__'
    const pattern = inferSectionPattern(page, block, blockKeyById)
    const groups = inferredByOwner.get(ownerKey) ?? []
    const current = groups[groups.length - 1]
    if (current?.pattern === pattern) current.keys.push(blockKey)
    else groups.push({ pattern, keys: [blockKey] })
    inferredByOwner.set(ownerKey, groups)
  }

  let inferredIndex = 0
  for (const groups of inferredByOwner.values()) {
    for (const group of groups) {
      inferredIndex += 1
      sections.push({
        key: `inferred-${group.pattern}-${inferredIndex}`,
        pattern: group.pattern,
        blockKeys: group.keys,
      })
    }
  }
  return sections
}

function inferSectionPattern(
  page: AiPagePlan,
  block: Block,
  blockKeyById: ReadonlyMap<string, string>,
): AiGenerationSectionPattern {
  if (block.type === 'repeater') return 'list'
  if (block.type === 'button') return 'actions'
  if (isFieldBlock(page, block, blockKeyById)) return 'form'
  return 'intro'
}

function proposeWholePagePlacements(
  page: AiPagePlan,
  blocks: Block[],
  blockKeyById: ReadonlyMap<string, string>,
): Map<string, GridPlacement> | null {
  const sections = (page.sections ?? [])
    .map((section) => resolveSectionMembers(section, blocks, blockKeyById))
    .filter((members) => members.blocks.length > 0)
  const ownerKeys = [...new Set(sections.map((members) => members.ownerId ?? '__page__'))]
  const placements = new Map<string, GridPlacement>()
  const preferredMode: CompositionMode = page.visualStyle?.density === 'compact'
    ? 'compact'
    : 'comfortable'
  const modes: CompositionMode[] = preferredMode === 'comfortable'
    ? ['comfortable', 'compact', 'dense']
    : ['compact', 'dense']

  for (const ownerKey of ownerKeys) {
    const ownerSections = sections.filter((members) => (
      (members.ownerId ?? '__page__') === ownerKey
    ))
    const ownerSpan = getOwnerSpan(ownerSections[0], blocks)
    let ownerPlacements: Map<string, GridPlacement> | null = null
    for (const mode of modes) {
      ownerPlacements = composeOwnerSections(ownerSections, ownerSpan, mode)
      if (ownerPlacements) break
    }
    if (!ownerPlacements) return null
    ownerPlacements.forEach((grid, id) => placements.set(id, grid))
  }
  return placements
}

function composeOwnerSections(
  sections: SectionMembers[],
  ownerSpan: { cols: number; rows: number },
  mode: CompositionMode,
): Map<string, GridPlacement> | null {
  const placements = new Map<string, GridPlacement>()
  const gutter = ownerSpan.cols >= 8 ? 1 : 0
  const contentStart = gutter + 1
  const contentWidth = Math.max(1, ownerSpan.cols - gutter * 2)
  const internalGap = mode === 'comfortable' ? 1 : 0
  const sectionGap = mode === 'comfortable' ? 2 : mode === 'compact' ? 1 : 0
  const topInset = mode === 'comfortable' && ownerSpan.rows >= 8 ? 1 : 0
  const bottomInset = topInset
  let rowStart = topInset + 1

  for (const section of sections) {
    const result = composeSection(
      section,
      rowStart,
      contentStart,
      contentWidth,
      ownerSpan,
      internalGap,
    )
    if (!result || result.rowEnd > ownerSpan.rows - bottomInset) return null
    result.placements.forEach((grid, id) => placements.set(id, grid))
    rowStart = result.rowEnd + sectionGap + 1
  }
  return placements
}

function composeSection(
  members: SectionMembers,
  rowStart: number,
  contentStart: number,
  contentWidth: number,
  ownerSpan: { cols: number; rows: number },
  gapRows: number,
): { placements: Map<string, GridPlacement>; rowEnd: number } | null {
  if (members.section.pattern === 'split' || members.section.pattern === 'actions') {
    return composePairedSection(
      members,
      rowStart,
      contentStart,
      contentWidth,
      ownerSpan,
      gapRows,
    )
  }

  const placements = new Map<string, GridPlacement>()
  let nextRow = rowStart
  for (const block of members.blocks) {
    const centeredAction = block.type === 'button'
    const requestedWidth = centeredAction
      ? Math.max(1, Math.min(contentWidth, Math.ceil(contentWidth * 0.65)))
      : contentWidth
    const grid = createCompositionPlacement(
      block,
      centeredAction
        ? contentStart + Math.floor((contentWidth - requestedWidth) / 2)
        : contentStart,
      nextRow,
      requestedWidth,
      ownerSpan,
    )
    if (!grid) return null
    placements.set(block.id, grid)
    nextRow = placementEndRow(grid) + gapRows + 1
  }
  return { placements, rowEnd: nextRow - gapRows - 1 }
}

function composePairedSection(
  members: SectionMembers,
  rowStart: number,
  contentStart: number,
  contentWidth: number,
  ownerSpan: { cols: number; rows: number },
  gapRows: number,
): { placements: Map<string, GridPlacement>; rowEnd: number } | null {
  const placements = new Map<string, GridPlacement>()
  const columnGap = contentWidth >= 8 ? 1 : 0
  const columnWidth = Math.max(1, Math.floor((contentWidth - columnGap) / 2))
  let nextRow = rowStart

  for (let index = 0; index < members.blocks.length; index += 2) {
    const first = members.blocks[index]
    const second = members.blocks[index + 1]
    if (!first) continue
    if (!second) {
      const width = members.section.pattern === 'actions'
        ? Math.max(1, Math.min(contentWidth, Math.ceil(contentWidth * 0.65)))
        : contentWidth
      const single = createCompositionPlacement(
        first,
        contentStart + Math.floor((contentWidth - width) / 2),
        nextRow,
        width,
        ownerSpan,
      )
      if (!single) return null
      placements.set(first.id, single)
      nextRow = placementEndRow(single) + gapRows + 1
      continue
    }

    const firstGrid = createCompositionPlacement(
      first,
      contentStart,
      nextRow,
      columnWidth,
      ownerSpan,
    )
    const secondGrid = createCompositionPlacement(
      second,
      contentStart + columnWidth + columnGap,
      nextRow,
      columnWidth,
      ownerSpan,
    )
    if (!firstGrid || !secondGrid || firstGrid.colSpan > columnWidth || secondGrid.colSpan > columnWidth) {
      const stackedFirst = createCompositionPlacement(
        first,
        contentStart,
        nextRow,
        contentWidth,
        ownerSpan,
      )
      if (!stackedFirst) return null
      const stackedSecond = createCompositionPlacement(
        second,
        contentStart,
        placementEndRow(stackedFirst) + gapRows + 1,
        contentWidth,
        ownerSpan,
      )
      if (!stackedSecond) return null
      placements.set(first.id, stackedFirst)
      placements.set(second.id, stackedSecond)
      nextRow = placementEndRow(stackedSecond) + gapRows + 1
      continue
    }

    const rowSpan = Math.max(firstGrid.rowSpan, secondGrid.rowSpan)
    placements.set(first.id, { ...firstGrid, rowSpan })
    placements.set(second.id, { ...secondGrid, rowSpan })
    nextRow += rowSpan + gapRows
  }
  return { placements, rowEnd: nextRow - gapRows - 1 }
}

function createCompositionPlacement(
  block: Block,
  colStart: number,
  rowStart: number,
  requestedWidth: number,
  ownerSpan: { cols: number; rows: number },
): GridPlacement | null {
  const constraints = getBlockGridConstraints(block)
  const colSpan = Math.min(
    ownerSpan.cols,
    Math.max(constraints.minSpan.cols, requestedWidth),
  )
  const proposed: GridPlacement = {
    colStart: Math.max(1, Math.min(colStart, ownerSpan.cols - colSpan + 1)),
    rowStart,
    colSpan,
    rowSpan: constraints.minSpan.rows,
  }
  const contentMinimum = getGeneratedContentMinimumSpan(block, proposed, ownerSpan.cols)
  const finalColSpan = Math.min(ownerSpan.cols, Math.max(colSpan, contentMinimum.cols))
  const requestedListRows = block.type === 'repeater'
    ? Math.min(10, Math.max(6, block.layout?.grid?.rowSpan ?? 6))
    : 0
  const rowSpan = Math.min(
    ownerSpan.rows,
    Math.max(constraints.minSpan.rows, contentMinimum.rows, requestedListRows),
  )
  if (rowStart + rowSpan - 1 > ownerSpan.rows) return null
  return {
    colStart: Math.max(1, Math.min(proposed.colStart, ownerSpan.cols - finalColSpan + 1)),
    rowStart,
    colSpan: finalColSpan,
    rowSpan,
  }
}

export function analyzeGeneratedPageComposition(
  page: AiPagePlan,
  blocks: Block[],
  blockKeyById: ReadonlyMap<string, string>,
): AiGenerationVisualIssue[] {
  if (!page.sections?.length) return []
  const issues: AiGenerationVisualIssue[] = []
  const assignedKeys = new Set(page.sections.flatMap((section) => section.blockKeys))
  const unassigned = blocks
    .map((block) => blockKeyById.get(block.id) ?? block.id)
    .filter((key) => !assignedKeys.has(key))
  if (unassigned.length) {
    issues.push({
      code: 'visual-unassigned-blocks',
      severity: 'warning',
      pageKey: page.key,
      blockKeys: unassigned,
      message: 'Some generated blocks are not assigned to a visual section.',
    })
  }

  for (const section of page.sections) {
    const members = resolveSectionMembers(section, blocks, blockKeyById)
    const placed = members.blocks.filter(hasGridPlacement)
    if (!placed.length) continue
    const ownerSpan = getOwnerSpan(members, blocks)
    const bounds = getBounds(placed)
    if (!bounds) continue
    const leftMargin = bounds.colStart - 1
    const rightMargin = ownerSpan.cols - bounds.colEnd
    const marginDifference = Math.abs(leftMargin - rightMargin)
    if (marginDifference > 1) {
      issues.push({
        code: 'visual-unbalanced-section',
        severity: marginDifference > 2 ? 'severe' : 'warning',
        pageKey: page.key,
        sectionKey: section.key,
        blockKeys: keysForBlocks(placed, blockKeyById),
        message: `Section "${section.key}" has visibly uneven horizontal margins.`,
      })
    }

    const bands = buildRowBands(placed)
    const gaps = bands.slice(1).map((band, index) => band.start - bands[index].end - 1)
    if (gaps.length > 1 && Math.max(...gaps) - Math.min(...gaps) > 1) {
      const difference = Math.max(...gaps) - Math.min(...gaps)
      issues.push({
        code: 'visual-inconsistent-gaps',
        severity: difference > 2 ? 'severe' : 'warning',
        pageKey: page.key,
        sectionKey: section.key,
        blockKeys: keysForBlocks(placed, blockKeyById),
        message: `Section "${section.key}" uses inconsistent vertical spacing.`,
      })
    }

    if (section.pattern === 'intro' || section.pattern === 'list') {
      const content = placed.filter((block) => !isActionBlock(block))
      const starts = content.map((block) => block.layout!.grid!.colStart)
      if (starts.length > 1 && Math.max(...starts) - Math.min(...starts) > 1) {
        issues.push({
          code: 'visual-misaligned-section',
          severity: Math.max(...starts) - Math.min(...starts) > 2 ? 'severe' : 'warning',
          pageKey: page.key,
          sectionKey: section.key,
          blockKeys: keysForBlocks(content, blockKeyById),
          message: `Related content in section "${section.key}" does not share a clear edge.`,
        })
      }
    }

    if (section.pattern === 'form') {
      const fields = placed.filter((block) => isFieldBlock(page, block, blockKeyById))
      if (fields.length > 1) {
        const starts = fields.map((block) => block.layout!.grid!.colStart)
        const spans = fields.map((block) => block.layout!.grid!.colSpan)
        if (new Set(starts).size > 1 || new Set(spans).size > 1) {
          issues.push({
            code: 'visual-inconsistent-fields',
            severity: 'severe',
            pageKey: page.key,
            sectionKey: section.key,
            blockKeys: keysForBlocks(fields, blockKeyById),
            message: `Related fields in section "${section.key}" do not use the same width and alignment.`,
          })
        }
      }
      const primaryActions = placed.filter((block) => (
        getBlockRole(page, block, blockKeyById) === 'primaryAction'
      ))
      const fieldEnd = fields.reduce((end, block) => Math.max(end, placementEndRow(block.layout!.grid!)), 0)
      if (fieldEnd && primaryActions.some((block) => block.layout!.grid!.rowStart <= fieldEnd)) {
        issues.push({
          code: 'visual-action-before-fields',
          severity: 'severe',
          pageKey: page.key,
          sectionKey: section.key,
          blockKeys: keysForBlocks(primaryActions, blockKeyById),
          message: `The primary action in section "${section.key}" must follow its fields.`,
        })
      }
    }

    if (section.pattern === 'split') {
      for (const band of bands) {
        const pair = band.blockIds
          .map((id) => placed.find((block) => block.id === id))
          .filter((block): block is (typeof placed)[number] => block !== undefined)
        if (pair.length !== 2) continue
        const orderedPair = [...pair].sort((a, b) => a.layout.grid.colStart - b.layout.grid.colStart)
        const left = orderedPair[0]
        const right = orderedPair[1]
        if (!left || !right) continue
        const leftGrid = left.layout!.grid!
        const rightGrid = right.layout!.grid!
        const outsideDifference = Math.abs(
          (leftGrid.colStart - 1) - (ownerSpan.cols - placementEndCol(rightGrid)),
        )
        if (leftGrid.colSpan !== rightGrid.colSpan || outsideDifference > 1) {
          issues.push({
            code: 'visual-unbalanced-split',
            severity: 'severe',
            pageKey: page.key,
            sectionKey: section.key,
            blockKeys: keysForBlocks(pair, blockKeyById),
            message: `Paired content in section "${section.key}" is not visually balanced.`,
          })
        }
      }
    }

    if (section.pattern === 'actions') {
      const actions = placed.filter(isActionBlock)
      if (actions.length === 2) {
        const [first, second] = actions
        const firstGrid = first.layout!.grid!
        const secondGrid = second.layout!.grid!
        if (firstGrid.rowStart !== secondGrid.rowStart || firstGrid.colSpan !== secondGrid.colSpan) {
          issues.push({
            code: 'visual-unbalanced-actions',
            severity: 'warning',
            pageKey: page.key,
            sectionKey: section.key,
            blockKeys: keysForBlocks(actions, blockKeyById),
            message: `Actions in section "${section.key}" do not form a balanced group.`,
          })
        }
      }
    }
  }

  return dedupeVisualIssues(issues)
}

function proposeSectionHorizontalPlacements(
  page: AiPagePlan,
  members: SectionMembers,
  allBlocks: Block[],
  blockKeyById: ReadonlyMap<string, string>,
): Map<string, GridPlacement> {
  const placements = new Map(
    members.blocks.flatMap((block) => block.layout?.grid ? [[block.id, { ...block.layout.grid }] as const] : []),
  )
  if (!placements.size) return placements
  const ownerSpan = getOwnerSpan(members, allBlocks)

  if (members.section.pattern === 'intro' || members.section.pattern === 'list') {
    alignSectionContent(members.blocks, placements)
  } else if (members.section.pattern === 'form') {
    alignFormContent(page, members, placements, blockKeyById)
  } else if (members.section.pattern === 'split') {
    balanceSplitContent(members.blocks, placements, ownerSpan.cols)
  } else {
    balanceActionContent(members.blocks, placements, ownerSpan.cols)
  }

  centerPlacementGroup(placements, ownerSpan.cols)
  return placements
}

function proposeSectionSpacingPlacements(
  page: AiPagePlan,
  members: SectionMembers,
): Map<string, GridPlacement> {
  const placements = new Map(
    members.blocks.flatMap((block) => block.layout?.grid
      ? [[block.id, { ...block.layout.grid }] as const]
      : []),
  )
  if (!placements.size) return placements
  normalizeBandSpacing(
    members.blocks,
    placements,
    page.visualStyle?.density === 'compact' ? 0 : 1,
  )
  return placements
}

function alignSectionContent(blocks: Block[], placements: Map<string, GridPlacement>): void {
  const content = blocks.filter((block) => !isActionBlock(block))
  if (content.length < 2) return
  const grids = content.map((block) => placements.get(block.id)).filter(isPlacement)
  const left = Math.min(...grids.map((grid) => grid.colStart))
  const right = Math.max(...grids.map(placementEndCol))
  content.forEach((block) => {
    const grid = placements.get(block.id)
    if (grid) placements.set(block.id, { ...grid, colStart: left, colSpan: right - left + 1 })
  })
}

function alignFormContent(
  page: AiPagePlan,
  members: SectionMembers,
  placements: Map<string, GridPlacement>,
  blockKeyById: ReadonlyMap<string, string>,
): void {
  const fields = members.blocks.filter((block) => isFieldBlock(page, block, blockKeyById))
  const fieldGrids = fields.map((block) => placements.get(block.id)).filter(isPlacement)
  if (fieldGrids.length > 1) {
    const left = Math.min(...fieldGrids.map((grid) => grid.colStart))
    const right = Math.max(...fieldGrids.map(placementEndCol))
    fields.forEach((block) => {
      const grid = placements.get(block.id)
      if (grid) placements.set(block.id, { ...grid, colStart: left, colSpan: right - left + 1 })
    })
  }

  const contentLeft = fieldGrids.length
    ? Math.min(...fieldGrids.map((grid) => grid.colStart))
    : Math.min(...[...placements.values()].map((grid) => grid.colStart))
  members.blocks.filter((block) => !isActionBlock(block) && !fields.includes(block)).forEach((block) => {
    const grid = placements.get(block.id)
    if (!grid) return
    placements.set(block.id, { ...grid, colStart: contentLeft })
  })
}

function balanceSplitContent(
  blocks: Block[],
  placements: Map<string, GridPlacement>,
  ownerColumns: number,
): void {
  const bands = buildRowBandsFromPlacements(blocks, placements)
  const contentWidth = Math.max(2, ownerColumns - 2)
  const gap = contentWidth >= 6 ? 2 : 0
  const columnWidth = Math.max(1, Math.floor((contentWidth - gap) / 2))
  const rowWidth = columnWidth * 2 + gap
  const rowStart = Math.floor((ownerColumns - rowWidth) / 2) + 1

  for (const band of bands) {
    const pair = band.blockIds
      .map((id) => blocks.find((block) => block.id === id))
      .filter((block): block is Block => Boolean(block))
      .sort((left, right) => (
        (placements.get(left.id)?.colStart ?? 1) - (placements.get(right.id)?.colStart ?? 1)
      ))
    if (pair.length !== 2) continue
    const row = Math.min(...pair.map((block) => placements.get(block.id)!.rowStart))
    const height = Math.max(...pair.map((block) => placements.get(block.id)!.rowSpan))
    placements.set(pair[0].id, {
      ...placements.get(pair[0].id)!,
      colStart: rowStart,
      colSpan: columnWidth,
      rowStart: row,
      rowSpan: height,
    })
    placements.set(pair[1].id, {
      ...placements.get(pair[1].id)!,
      colStart: rowStart + columnWidth + gap,
      colSpan: columnWidth,
      rowStart: row,
      rowSpan: height,
    })
  }
}

function balanceActionContent(
  blocks: Block[],
  placements: Map<string, GridPlacement>,
  ownerColumns: number,
): void {
  const actions = blocks.filter(isActionBlock)
  if (actions.length === 1) {
    const grid = placements.get(actions[0].id)
    if (grid) placements.set(actions[0].id, {
      ...grid,
      colStart: Math.floor((ownerColumns - grid.colSpan) / 2) + 1,
    })
    return
  }
  if (actions.length !== 2) return

  const contentWidth = Math.max(2, ownerColumns - 2)
  const gap = contentWidth >= 6 ? 2 : 0
  const columnWidth = Math.max(1, Math.floor((contentWidth - gap) / 2))
  const rowWidth = columnWidth * 2 + gap
  const start = Math.floor((ownerColumns - rowWidth) / 2) + 1
  const row = Math.min(...actions.map((block) => placements.get(block.id)!.rowStart))
  const height = Math.max(...actions.map((block) => placements.get(block.id)!.rowSpan))
  actions
    .sort((left, right) => placements.get(left.id)!.colStart - placements.get(right.id)!.colStart)
    .forEach((block, index) => placements.set(block.id, {
      ...placements.get(block.id)!,
      colStart: start + index * (columnWidth + gap),
      colSpan: columnWidth,
      rowStart: row,
      rowSpan: height,
    }))
}

function normalizeBandSpacing(
  blocks: Block[],
  placements: Map<string, GridPlacement>,
  gapRows: number,
): void {
  const bands = buildRowBandsFromPlacements(blocks, placements)
  let previousEnd = bands[0]?.end
  for (const band of bands.slice(1)) {
    if (previousEnd === undefined) break
    const desiredStart = previousEnd + gapRows + 1
    const delta = desiredStart - band.start
    band.blockIds.forEach((id) => {
      const grid = placements.get(id)
      if (grid) placements.set(id, { ...grid, rowStart: grid.rowStart + delta })
    })
    previousEnd = band.end + delta
  }
}

function centerPlacementGroup(placements: Map<string, GridPlacement>, ownerColumns: number): void {
  if (!placements.size) return
  const left = Math.min(...[...placements.values()].map((grid) => grid.colStart))
  const right = Math.max(...[...placements.values()].map(placementEndCol))
  const width = right - left + 1
  const desiredLeft = Math.floor((ownerColumns - width) / 2) + 1
  const delta = desiredLeft - left
  if (!delta) return
  placements.forEach((grid, id) => placements.set(id, { ...grid, colStart: grid.colStart + delta }))
}

function proposeInterSectionSpacing(
  page: AiPagePlan,
  blocks: Block[],
  blockKeyById: ReadonlyMap<string, string>,
): Map<string, GridPlacement> {
  const placements = new Map<string, GridPlacement>()
  const sections = (page.sections ?? [])
    .map((section) => resolveSectionMembers(section, blocks, blockKeyById))
    .filter((members) => members.blocks.some(hasGridPlacement))
  const byOwner = new Map<string, SectionMembers[]>()
  sections.forEach((members) => {
    const key = members.ownerId ?? '__page__'
    byOwner.set(key, [...(byOwner.get(key) ?? []), members])
  })
  const gapRows = page.visualStyle?.density === 'compact' ? 1 : 2

  for (const ownerSections of byOwner.values()) {
    const ordered = ownerSections
      .map((members) => ({ members, bounds: getBounds(members.blocks.filter(hasGridPlacement)) }))
      .filter((entry): entry is { members: SectionMembers; bounds: NonNullable<ReturnType<typeof getBounds>> } => Boolean(entry.bounds))
      .sort((left, right) => left.bounds.rowStart - right.bounds.rowStart)
    let previousEnd = ordered[0]?.bounds.rowEnd
    for (const entry of ordered.slice(1)) {
      if (previousEnd === undefined) break
      const desiredStart = previousEnd + gapRows + 1
      const delta = desiredStart - entry.bounds.rowStart
      entry.members.blocks.forEach((block) => {
        const grid = block.layout?.grid
        if (grid) placements.set(block.id, { ...grid, rowStart: grid.rowStart + delta })
      })
      previousEnd = entry.bounds.rowEnd + delta
    }
  }
  return placements
}

function resolveSectionMembers(
  section: AiPageSectionPlan,
  blocks: Block[],
  blockKeyById: ReadonlyMap<string, string>,
): SectionMembers {
  const keys = new Set(section.blockKeys)
  const members = blocks.filter((block) => keys.has(blockKeyById.get(block.id) ?? block.id))
  return {
    section,
    blocks: members,
    ...(members[0]?.parentId ? { ownerId: members[0].parentId } : {}),
  }
}

function getOwnerSpan(members: SectionMembers, blocks: Block[]): { cols: number; rows: number } {
  if (!members.ownerId) return { cols: GRID_COLUMN_COUNT, rows: GRID_DEFAULT_ROW_COUNT }
  const parent = blocks.find((block) => block.id === members.ownerId)
  return parent ? getChildOwnerSpan(parent) : { cols: GRID_COLUMN_COUNT, rows: GRID_DEFAULT_ROW_COUNT }
}

function canApplyPlacements(
  changedBlocks: Block[],
  placements: ReadonlyMap<string, GridPlacement>,
  allBlocks: Block[],
): boolean {
  const changedIds = new Set(changedBlocks.map((block) => block.id))
  const candidateBlocks = allBlocks.map((block) => {
    const grid = placements.get(block.id)
    return grid ? { ...block, layout: { ...(block.layout || {}), grid } } : block
  })
  const candidateById = new Map(candidateBlocks.map((block) => [block.id, block]))

  for (const id of changedIds) {
    const block = candidateById.get(id)
    const grid = block?.layout?.grid
    if (!block || !grid) return false
    const ownerSpan = block.parentId
      ? getChildOwnerSpan(candidateById.get(block.parentId) ?? block)
      : { cols: GRID_COLUMN_COUNT, rows: GRID_DEFAULT_ROW_COUNT }
    if (!isWithin(grid, ownerSpan.cols, ownerSpan.rows)) return false
    const siblings = candidateBlocks.filter((candidate) => (
      candidate.id !== block.id
      && (candidate.parentId ?? undefined) === (block.parentId ?? undefined)
    ))
    if (siblings.some((sibling) => sibling.layout?.grid && placementsOverlap(grid, sibling.layout.grid))) {
      return false
    }
  }
  return true
}

function applyPlacements(blocks: Block[], placements: ReadonlyMap<string, GridPlacement>): Block[] {
  return blocks.map((block) => {
    const grid = placements.get(block.id)
    return grid ? { ...block, layout: { ...(block.layout || {}), grid } } : block
  })
}

function describeRepairs(
  pageKey: string,
  members: SectionMembers,
  before: Block[],
  after: Block[],
  blockKeyById: ReadonlyMap<string, string>,
): AiGenerationCompositionRepair[] {
  const beforeById = new Map(before.map((block) => [block.id, block]))
  return members.blocks.flatMap((block) => {
    const from = beforeById.get(block.id)?.layout?.grid
    const to = after.find((candidate) => candidate.id === block.id)?.layout?.grid
    if (!from || !to || gridsEqual(from, to)) return []
    const reason = members.section.pattern === 'split'
      ? 'balanced-split'
      : members.section.pattern === 'actions'
        ? 'balanced-actions'
        : from.rowStart !== to.rowStart
          ? 'normalized-section-spacing'
          : from.colSpan !== to.colSpan
            ? 'aligned-section-edges'
            : 'centered-section'
    return [{
      pageKey,
      sectionKey: members.section.key,
      blockKey: blockKeyById.get(block.id) ?? block.id,
      reason,
      from,
      to,
    }]
  })
}

function describeSpacingRepairs(
  pageKey: string,
  before: Block[],
  after: Block[],
  blockKeyById: ReadonlyMap<string, string>,
  sections: AiPageSectionPlan[],
): AiGenerationCompositionRepair[] {
  const sectionByBlockKey = new Map(sections.flatMap((section) => (
    section.blockKeys.map((key) => [key, section.key] as const)
  )))
  const afterById = new Map(after.map((block) => [block.id, block]))
  return before.flatMap((block) => {
    const from = block.layout?.grid
    const to = afterById.get(block.id)?.layout?.grid
    const blockKey = blockKeyById.get(block.id) ?? block.id
    const sectionKey = sectionByBlockKey.get(blockKey)
    if (!from || !to || !sectionKey || gridsEqual(from, to)) return []
    return [{
      pageKey,
      sectionKey,
      blockKey,
      reason: 'normalized-section-spacing' as const,
      from,
      to,
    }]
  })
}

function getBlockRole(
  page: AiPagePlan,
  block: Block,
  blockKeyById: ReadonlyMap<string, string>,
) {
  const key = blockKeyById.get(block.id)
  const plan = key ? page.blocks.find((candidate) => candidate.key === key) : undefined
  return plan ? resolveGeneratedVisualRole(plan) : undefined
}

function isFieldBlock(
  page: AiPagePlan,
  block: Block,
  blockKeyById: ReadonlyMap<string, string>,
): boolean {
  return block.type === 'text'
    && (block.props.editable === true || getBlockRole(page, block, blockKeyById) === 'field')
}

function isActionBlock(block: Block): boolean {
  return block.type === 'button'
}

function buildRowBands(blocks: Block[]): RowBand[] {
  return buildRowBandsFromPlacements(
    blocks,
    new Map(blocks.flatMap((block) => block.layout?.grid ? [[block.id, block.layout.grid] as const] : [])),
  )
}

function buildRowBandsFromPlacements(
  blocks: Block[],
  placements: ReadonlyMap<string, GridPlacement>,
): RowBand[] {
  const ordered = blocks
    .flatMap((block) => {
      const grid = placements.get(block.id)
      return grid ? [{ block, grid }] : []
    })
    .sort((left, right) => (
      left.grid.rowStart - right.grid.rowStart || left.grid.colStart - right.grid.colStart
    ))
  const bands: RowBand[] = []
  for (const entry of ordered) {
    const end = placementEndRow(entry.grid)
    const current = bands[bands.length - 1]
    if (current && entry.grid.rowStart <= current.end) {
      current.blockIds.push(entry.block.id)
      current.end = Math.max(current.end, end)
    } else {
      bands.push({ blockIds: [entry.block.id], start: entry.grid.rowStart, end })
    }
  }
  return bands
}

function getBounds(blocks: Block[]): {
  colStart: number
  colEnd: number
  rowStart: number
  rowEnd: number
} | null {
  const grids = blocks.map((block) => block.layout?.grid).filter(isPlacement)
  if (!grids.length) return null
  return {
    colStart: Math.min(...grids.map((grid) => grid.colStart)),
    colEnd: Math.max(...grids.map(placementEndCol)),
    rowStart: Math.min(...grids.map((grid) => grid.rowStart)),
    rowEnd: Math.max(...grids.map(placementEndRow)),
  }
}

function keysForBlocks(blocks: Block[], blockKeyById: ReadonlyMap<string, string>): string[] {
  return blocks.map((block) => blockKeyById.get(block.id) ?? block.id)
}

function placementsChanged(blocks: Block[], placements: ReadonlyMap<string, GridPlacement>): boolean {
  return blocks.some((block) => {
    const from = block.layout?.grid
    const to = placements.get(block.id)
    return Boolean(from && to && !gridsEqual(from, to))
  })
}

function hasGridPlacement(block: Block): block is Block & { layout: { grid: GridPlacement } } {
  return Boolean(block.layout?.grid)
}

function isPlacement(value: GridPlacement | undefined): value is GridPlacement {
  return Boolean(value)
}

function isWithin(grid: GridPlacement, columns: number, rows: number): boolean {
  return grid.colStart >= 1
    && grid.rowStart >= 1
    && placementEndCol(grid) <= columns
    && placementEndRow(grid) <= rows
}

function placementEndCol(grid: GridPlacement): number {
  return grid.colStart + grid.colSpan - 1
}

function placementEndRow(grid: GridPlacement): number {
  return grid.rowStart + grid.rowSpan - 1
}

function gridsEqual(left: GridPlacement, right: GridPlacement): boolean {
  return left.colStart === right.colStart
    && left.rowStart === right.rowStart
    && left.colSpan === right.colSpan
    && left.rowSpan === right.rowSpan
}

function dedupeVisualIssues(issues: AiGenerationVisualIssue[]): AiGenerationVisualIssue[] {
  const seen = new Set<string>()
  return issues.filter((issue) => {
    const key = `${issue.code}:${issue.pageKey}:${issue.sectionKey ?? ''}:${issue.blockKeys.join(',')}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
