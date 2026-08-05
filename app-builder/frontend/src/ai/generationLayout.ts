import {
  GRID_COLUMN_COUNT,
  GRID_DEFAULT_ROW_COUNT,
  GRID_ROW_HEIGHT,
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
import type { AiGenerationPlanIssue } from '@apptura/shared/ai'

const GENERATION_CANVAS_WIDTH = 390
const GENERATION_COLUMN_WIDTH = GENERATION_CANVAS_WIDTH / GRID_COLUMN_COUNT
const CONTENT_HEIGHT_TOLERANCE = 4

export type AiGenerationLayoutRepair = {
  pageKey: string
  blockKey: string
  reason: 'clamped-to-grid' | 'expanded-to-fit-content' | 'moved-to-free-space' | 'reflowed-to-fit-page'
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
        details: { pageKey, blockKey },
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
        details: { pageKey, blockKey },
      })
    }

    const ownerSpan = parent
      ? getChildOwnerSpan(parent)
      : { cols: GRID_COLUMN_COUNT, rows: GRID_DEFAULT_ROW_COUNT }
    const registryConstraints = getBlockGridConstraints(original)
    const contentMinimum = getGeneratedContentMinimumSpan(
      original,
      proposed,
      ownerSpan.cols,
    )
    if (contentMinimum.rows > ownerSpan.rows) {
      issues.push({
        code: 'content-too-large',
        path: `pages.${pageKey}.blocks.${blockKey}.grid`,
        message: 'The generated block content cannot fit within its available grid rows.',
        details: {
          pageKey,
          blockKey,
          proposedGrid: proposed,
          requiredSpan: contentMinimum,
          availableSpan: ownerSpan,
        },
      })
    }
    const minimumSpan = {
      cols: Math.min(
        ownerSpan.cols,
        Math.max(registryConstraints.minSpan.cols, contentMinimum.cols),
      ),
      rows: Math.min(
        ownerSpan.rows,
        Math.max(registryConstraints.minSpan.rows, contentMinimum.rows),
      ),
    }
    const constraints = getScopedGridConstraints(
      {
        ...registryConstraints,
        defaultSpan: {
          cols: Math.max(proposed.colSpan, minimumSpan.cols),
          rows: Math.max(proposed.rowSpan, minimumSpan.rows),
        },
        minSpan: minimumSpan,
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
        reason: expandedPastRegistryMinimum(proposed, bounded, registryConstraints.minSpan)
          ? 'expanded-to-fit-content'
          : 'clamped-to-grid',
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
        const currentCandidate: Block = {
          ...original,
          layout: {
            ...(original.layout || {}),
            grid: placement,
          },
        }
        const compacted = compactSiblingPlacements(
          [...siblings, currentCandidate],
          ownerSpan.cols,
          ownerSpan.rows,
        )
        if (!compacted) {
          issues.push({
            code: 'layout-full',
            path: `pages.${pageKey}.blocks.${blockKey}.grid`,
            message: 'No collision-free grid placement is available for this block.',
            details: {
              pageKey,
              blockKey,
              proposedGrid: proposed,
              normalizedGrid: placement,
              requiredSpan: minimumSpan,
              availableSpan: ownerSpan,
              siblingBlockKeys: siblings
                .map((sibling) => blockKeyById.get(sibling.id) ?? sibling.id)
                .slice(0, 20),
            },
          })
        } else {
          for (const sibling of siblings) {
            const siblingPlacement = sibling.layout?.grid
            const compactedPlacement = compacted.get(sibling.id)
            if (!siblingPlacement || !compactedPlacement || placementsEqual(siblingPlacement, compactedPlacement)) {
              continue
            }
            repairs.push({
              pageKey,
              blockKey: blockKeyById.get(sibling.id) ?? sibling.id,
              reason: 'reflowed-to-fit-page',
              from: siblingPlacement,
              to: compactedPlacement,
            })
            replaceProcessedPlacement(processed, processedById, sibling.id, compactedPlacement)
          }

          const compactedPlacement = compacted.get(original.id)
          if (compactedPlacement) {
            if (!placementsEqual(placement, compactedPlacement)) {
              repairs.push({
                pageKey,
                blockKey,
                reason: 'reflowed-to-fit-page',
                from: placement,
                to: compactedPlacement,
              })
            }
            placement = compactedPlacement
          }
        }
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
      details: { pageKey, blockKey },
    })
  }

  return { blocks: finalBlocks, repairs, issues }
}

function compactSiblingPlacements(
  blocks: Block[],
  columnCount: number,
  rowCount: number,
): Map<string, GridPlacement> | null {
  const placements = new Map<string, GridPlacement>()
  const placed: Block[] = []

  for (const block of blocks) {
    const requested = block.layout?.grid
    if (!requested) return null
    const maxColStart = Math.max(1, columnCount - requested.colSpan + 1)
    const maxRowStart = Math.max(1, rowCount - requested.rowSpan + 1)
    const columnStarts = Array.from({ length: maxColStart }, (_, index) => index + 1)
      .sort((left, right) => {
        const leftDistance = Math.abs(left - requested.colStart)
        const rightDistance = Math.abs(right - requested.colStart)
        return leftDistance === rightDistance ? left - right : leftDistance - rightDistance
      })
    let available: GridPlacement | null = null

    for (let rowStart = 1; rowStart <= maxRowStart && !available; rowStart += 1) {
      for (const colStart of columnStarts) {
        const candidate = {
          colStart,
          rowStart,
          colSpan: requested.colSpan,
          rowSpan: requested.rowSpan,
        }
        if (!collidesWithBlocks(candidate, placed)) {
          available = candidate
          break
        }
      }
    }
    if (!available) return null

    const compacted: Block = {
      ...block,
      layout: {
        ...(block.layout || {}),
        grid: available,
      },
    }
    placements.set(block.id, available)
    placed.push(compacted)
  }

  return placements
}

function replaceProcessedPlacement(
  processed: Block[],
  processedById: Map<string, Block>,
  blockId: string,
  placement: GridPlacement,
): void {
  const index = processed.findIndex((block) => block.id === blockId)
  if (index < 0) return
  const current = processed[index]
  const next = {
    ...current,
    layout: {
      ...(current.layout || {}),
      grid: placement,
    },
  }
  processed[index] = next
  processedById.set(blockId, next)
}

function getGeneratedContentMinimumSpan(
  block: Block,
  proposed: GridPlacement,
  ownerColumnCount: number,
): { cols: number; rows: number } {
  if (block.type === 'hero') {
    const text = stringProp(block, 'headline', 'Headline')
    const fontSize = numberProp(block, 'headlineSize', 28, 8)
    const contentPadding = numberProp(block, 'contentPadding', 16, 0)
    const cols = getReadableTextColumnCount(
      text,
      fontSize,
      contentPadding,
      2,
      6,
      ownerColumnCount,
      0.58,
    )
    const layoutCols = Math.min(ownerColumnCount, Math.max(proposed.colSpan, cols))
    const availableWidth = Math.max(1, layoutCols * GENERATION_COLUMN_WIDTH - contentPadding * 2)
    const lineCount = estimateWrappedLineCount(text, availableWidth, fontSize, 0.58)
    const contentHeight = contentPadding * 2 + lineCount * fontSize * 1.15 + CONTENT_HEIGHT_TOLERANCE
    return { cols, rows: Math.max(2, Math.ceil(contentHeight / GRID_ROW_HEIGHT)) }
  }

  if (block.type === 'text') {
    const editable = booleanProp(block, 'editable', false)
    const fontSize = numberProp(block, 'fontSize', 16, 8)
    const contentPadding = numberProp(block, 'contentPadding', 12, 0)
    if (editable) {
      const fieldLabel = stringProp(block, 'fieldLabel', 'Text field')
      const value = stringProp(block, 'value', '')
      const placeholder = stringProp(block, 'placeholder', 'Enter text...')
      const showFieldLabel = booleanProp(block, 'showFieldLabel', false)
      const displayText = [showFieldLabel ? fieldLabel : '', value || placeholder]
        .sort((left, right) => right.length - left.length)[0] || 'Text field'
      const textWidth = estimateUnwrappedTextWidth(displayText, fontSize, 0.54)
      const width = contentPadding * 2 + 20 + textWidth
      const cols = clampInteger(Math.ceil(width / GENERATION_COLUMN_WIDTH), 6, ownerColumnCount)
      const multiline = stringProp(block, 'textInputMode', 'singleLine') === 'multiline'
      const labelHeight = showFieldLabel ? Math.max(8, fontSize - 2) * 1.2 + 6 : 0
      const fieldLineCount = multiline
        ? estimateWrappedLineCount(
            value || placeholder,
            Math.max(1, cols * GENERATION_COLUMN_WIDTH - contentPadding * 2 - 20),
            fontSize,
            0.54,
          )
        : 1
      const contentHeight = contentPadding * 2
        + labelHeight
        + fieldLineCount * fontSize * 1.45
        + 16
        - CONTENT_HEIGHT_TOLERANCE
      return {
        cols,
        rows: Math.max(multiline ? 4 : 3, Math.ceil(contentHeight / GRID_ROW_HEIGHT)),
      }
    }

    const text = stringProp(block, 'value', 'Text')
    const cols = getReadableTextColumnCount(
      text,
      fontSize,
      contentPadding,
      3,
      4,
      ownerColumnCount,
      0.54,
    )
    const layoutCols = Math.min(ownerColumnCount, Math.max(proposed.colSpan, cols))
    const availableWidth = Math.max(1, layoutCols * GENERATION_COLUMN_WIDTH - contentPadding * 2)
    const lineCount = estimateWrappedLineCount(text, availableWidth, fontSize, 0.54)
    const contentHeight = contentPadding * 2 + lineCount * fontSize * 1.45 + CONTENT_HEIGHT_TOLERANCE
    return { cols, rows: Math.max(1, Math.ceil(contentHeight / GRID_ROW_HEIGHT)) }
  }

  if (block.type === 'button') {
    const label = stringProp(block, 'label', 'Button')
    const fontSize = numberProp(block, 'fontSize', 14, 8)
    const contentPadding = numberProp(block, 'contentPadding', 12, 0)
    const buttonPaddingX = numberProp(block, 'buttonPaddingX', 14, 0)
    const buttonPaddingY = numberProp(block, 'buttonPaddingY', 10, 0)
    const width = contentPadding * 2
      + buttonPaddingX * 2
      + estimateUnwrappedTextWidth(label, fontSize, 0.58)
      + CONTENT_HEIGHT_TOLERANCE
    const height = contentPadding * 2
      + buttonPaddingY * 2
      + fontSize * 1.2
      - CONTENT_HEIGHT_TOLERANCE * 2
    return {
      cols: clampInteger(Math.ceil(width / GENERATION_COLUMN_WIDTH), 4, ownerColumnCount),
      rows: Math.max(2, Math.ceil(height / GRID_ROW_HEIGHT)),
    }
  }

  return { cols: 1, rows: 1 }
}

function getReadableTextColumnCount(
  text: string,
  fontSize: number,
  contentPadding: number,
  targetLineCount: number,
  minimumColumns: number,
  maximumColumns: number,
  glyphWidthFactor: number,
): number {
  const longestParagraphWidth = Math.max(
    ...normalizeText(text).split('\n').map((line) => (
      estimateUnwrappedTextWidth(line, fontSize, glyphWidthFactor)
    )),
  )
  const targetWidth = longestParagraphWidth / targetLineCount + contentPadding * 2
  return clampInteger(
    Math.ceil(targetWidth / GENERATION_COLUMN_WIDTH),
    Math.min(minimumColumns, maximumColumns),
    maximumColumns,
  )
}

function estimateWrappedLineCount(
  text: string,
  availableWidth: number,
  fontSize: number,
  glyphWidthFactor: number,
): number {
  const maxCharacters = Math.max(1, Math.floor(availableWidth / (fontSize * glyphWidthFactor)))
  return normalizeText(text).split('\n').reduce((total, paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean)
    if (!words.length) return total + 1

    let lines = 1
    let usedCharacters = 0
    for (const word of words) {
      if (word.length > maxCharacters) {
        if (usedCharacters > 0) lines += 1
        lines += Math.ceil(word.length / maxCharacters) - 1
        usedCharacters = word.length % maxCharacters
        continue
      }

      const nextCharacters = usedCharacters === 0 ? word.length : usedCharacters + 1 + word.length
      if (nextCharacters > maxCharacters) {
        lines += 1
        usedCharacters = word.length
      } else {
        usedCharacters = nextCharacters
      }
    }
    return total + lines
  }, 0)
}

function estimateUnwrappedTextWidth(text: string, fontSize: number, glyphWidthFactor: number): number {
  return Math.max(1, normalizeText(text).length) * fontSize * glyphWidthFactor
}

function normalizeText(text: string): string {
  return text.replace(/\r\n?/g, '\n') || ' '
}

function stringProp(block: Block, key: string, fallback: string): string {
  const value = block.props[key]
  return typeof value === 'string' ? value : fallback
}

function numberProp(block: Block, key: string, fallback: number, minimum: number): number {
  const value = Number(block.props[key])
  return Number.isFinite(value) ? Math.max(minimum, value) : fallback
}

function booleanProp(block: Block, key: string, fallback: boolean): boolean {
  const value = block.props[key]
  return typeof value === 'boolean' ? value : fallback
}

function clampInteger(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, Math.ceil(value)))
}

function expandedPastRegistryMinimum(
  proposed: GridPlacement,
  bounded: GridPlacement,
  registryMinimum: { cols: number; rows: number },
): boolean {
  return bounded.colSpan > Math.max(proposed.colSpan, registryMinimum.cols)
    || bounded.rowSpan > Math.max(proposed.rowSpan, registryMinimum.rows)
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
