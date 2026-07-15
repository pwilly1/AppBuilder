import { BlockRegistry, isSupportedBlockType } from './registry'
import {
  findFirstAvailablePlacement,
  getBlockGridConstraints,
  normalizePlacement,
  GRID_COLUMN_COUNT,
} from './gridLayout'
import { getBlockEditorPlacement } from './runtimeLayout'
import { repairBlockHierarchy } from './blockHierarchy'
import type { Block, GridPlacement, Page, Project } from './types'

export const GRID_DENSITY_SCHEMA_VERSION = 2
export const CONTAINER_SCHEMA_VERSION = 3
export const UNIFIED_BUTTON_SCHEMA_VERSION = 4
export const CURRENT_SCHEMA_VERSION = UNIFIED_BUTTON_SCHEMA_VERSION

function migrateLegacyButton(block: Block): Block {
  const legacyType = String(block.type)
  if (legacyType !== 'navButton' && legacyType !== 'submitButton') return block

  const props = { ...(block.props as Record<string, unknown>) }
  if (!props.action) {
    if (legacyType === 'navButton') {
      props.action = {
        type: 'navigate',
        targetPageId: typeof props.toPageId === 'string' ? props.toPageId : '',
      }
    } else {
      const submitGroupId = typeof props.submitGroupId === 'string' && props.submitGroupId.trim()
        ? props.submitGroupId.trim()
        : 'default'
      const collectionId = typeof props.collectionId === 'string' ? props.collectionId.trim() : ''
      props.action = {
        type: 'submitData',
        submitGroupId,
        ...(collectionId ? { collectionId } : {}),
      }
    }
  }
  if (!props.label) props.label = legacyType === 'submitButton' ? 'Submit' : 'Go'
  delete props.toPageId

  return { ...block, type: 'button', props }
}

function scalePlacementFromEightColumnGrid(placement: GridPlacement): GridPlacement {
  return {
    colStart: (placement.colStart - 1) * 2 + 1,
    rowStart: (placement.rowStart - 1) * 2 + 1,
    colSpan: placement.colSpan * 2,
    rowSpan: placement.rowSpan * 2,
  }
}

function sortByLegacyPlacement(blocks: Block[]): Block[] {
  return [...blocks].sort((a, b) => {
    const aPlacement = getBlockEditorPlacement(a)
    const bPlacement = getBlockEditorPlacement(b)
    if (aPlacement.y !== bPlacement.y) return aPlacement.y - bPlacement.y
    if (aPlacement.x !== bPlacement.x) return aPlacement.x - bPlacement.x
    return a.id.localeCompare(b.id)
  })
}

function ensureRenderDefaults(block: Block): Block {
  const defaults = BlockRegistry[block.type]?.defaultRender ?? {}
  return {
    ...block,
    render: {
      alignX: 'center',
      alignY: 'center',
      ...defaults,
      ...(block.render || {}),
    },
  }
}

export function migratePageToGridLayout(page: Page, options: { scaleLegacyGridDensity?: boolean } = {}): Page {
  const convertedBlocks = page.blocks.map(migrateLegacyButton)
  const supportedBlocks = convertedBlocks.filter((block) => isSupportedBlockType(block.type))
  if (!supportedBlocks.length) return supportedBlocks.length === convertedBlocks.length ? { ...page, blocks: convertedBlocks } : { ...page, blocks: [] }

  const supportedPage = { ...page, blocks: supportedBlocks }

  const migratedById = new Map<string, Block>()
  const placedBlocks: Block[] = []

  for (const block of supportedPage.blocks) {
    if (!block.layout?.grid) continue

    const constraints = getBlockGridConstraints(block)
    const grid = options.scaleLegacyGridDensity
      ? scalePlacementFromEightColumnGrid(block.layout.grid)
      : block.layout.grid
    const migrated = ensureRenderDefaults({
      ...block,
      layout: {
        ...(block.layout || {}),
        grid: normalizePlacement(grid, constraints, GRID_COLUMN_COUNT),
      },
    })

    migratedById.set(migrated.id, migrated)
    placedBlocks.push(migrated)
  }

  for (const block of sortByLegacyPlacement(supportedPage.blocks.filter((candidate) => !candidate.layout?.grid))) {
    const migrated = ensureRenderDefaults({
      ...block,
      layout: {
        ...(block.layout || {}),
        grid: findFirstAvailablePlacement(placedBlocks, getBlockGridConstraints(block)),
      },
    })

    migratedById.set(migrated.id, migrated)
    placedBlocks.push(migrated)
  }

  const migratedPage = {
    ...supportedPage,
    blocks: supportedPage.blocks.map((block) => migratedById.get(block.id) ?? ensureRenderDefaults(block)),
  }

  return {
    ...migratedPage,
    blocks: repairBlockHierarchy(migratedPage.blocks).blocks,
  }
}

export function migrateProjectToGridLayout(project: Project): Project {
  const scaleLegacyGridDensity = (project.schemaVersion ?? 1) < GRID_DENSITY_SCHEMA_VERSION

  return {
    ...project,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    pages: project.pages.map((page) => migratePageToGridLayout(page, { scaleLegacyGridDensity })),
  }
}
