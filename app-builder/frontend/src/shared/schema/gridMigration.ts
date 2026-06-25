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
export const CURRENT_SCHEMA_VERSION = CONTAINER_SCHEMA_VERSION

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
  const supportedBlocks = page.blocks.filter((block) => isSupportedBlockType(block.type))
  if (!supportedBlocks.length) return supportedBlocks.length === page.blocks.length ? page : { ...page, blocks: [] }

  const supportedPage = supportedBlocks.length === page.blocks.length ? page : { ...page, blocks: supportedBlocks }

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
