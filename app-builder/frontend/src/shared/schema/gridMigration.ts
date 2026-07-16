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
export const EXPLICIT_SUBMIT_FIELDS_SCHEMA_VERSION = 5
export const CURRENT_SCHEMA_VERSION = EXPLICIT_SUBMIT_FIELDS_SCHEMA_VERSION

const SUBMISSION_FIELD_TYPES = new Set(['input', 'textarea', 'checkbox', 'toggle'])

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

function migrateExplicitSubmitFields(blocks: Block[]): Block[] {
  return blocks.map((block) => {
    const props = { ...(block.props as Record<string, any>) }
    const action = props.action

    if (block.type === 'button' && action?.type === 'submitData') {
      const existingFields = Array.isArray(action.fields)
        ? action.fields
            .map((field: any) => ({
              fieldBlockId: typeof field?.fieldBlockId === 'string' ? field.fieldBlockId.trim() : '',
              targetFieldKey: typeof field?.targetFieldKey === 'string' ? field.targetFieldKey.trim() : '',
            }))
            .filter((field: { fieldBlockId: string }) => field.fieldBlockId)
        : []
      const submitGroupId = typeof action.submitGroupId === 'string' && action.submitGroupId.trim()
        ? action.submitGroupId.trim()
        : typeof props.submitGroupId === 'string' && props.submitGroupId.trim()
          ? props.submitGroupId.trim()
          : 'default'
      const fields = existingFields.length > 0
        ? existingFields
        : blocks
            .filter((candidate) => SUBMISSION_FIELD_TYPES.has(candidate.type))
            .filter((candidate) => {
              const candidateGroup = typeof candidate.props.submitGroupId === 'string' && candidate.props.submitGroupId.trim()
                ? candidate.props.submitGroupId.trim()
                : 'default'
              return candidateGroup === submitGroupId
            })
            .map((candidate) => ({
              fieldBlockId: candidate.id,
              ...(typeof candidate.props.fieldKey === 'string' && candidate.props.fieldKey.trim()
                ? { targetFieldKey: candidate.props.fieldKey.trim() }
                : {}),
            }))
      const collectionId = typeof action.collectionId === 'string' && action.collectionId.trim()
        ? action.collectionId.trim()
        : typeof props.collectionId === 'string' && props.collectionId.trim()
          ? props.collectionId.trim()
          : ''

      props.action = {
        type: 'submitData',
        fields,
        ...(collectionId ? { collectionId } : {}),
      }
      delete props.submitGroupId
      delete props.collectionId
    }

    if (SUBMISSION_FIELD_TYPES.has(block.type)) delete props.submitGroupId
    return { ...block, props }
  })
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

export function migratePageToGridLayout(
  page: Page,
  options: { scaleLegacyGridDensity?: boolean; migrateLegacySubmissionGroups?: boolean } = {},
): Page {
  const legacyButtonsMigrated = page.blocks.map(migrateLegacyButton)
  const convertedBlocks = options.migrateLegacySubmissionGroups
    ? migrateExplicitSubmitFields(legacyButtonsMigrated)
    : legacyButtonsMigrated
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
  const migrateLegacySubmissionGroups = (project.schemaVersion ?? 1) < EXPLICIT_SUBMIT_FIELDS_SCHEMA_VERSION

  return {
    ...project,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    pages: project.pages.map((page) => migratePageToGridLayout(page, {
      scaleLegacyGridDensity,
      migrateLegacySubmissionGroups,
    })),
  }
}
