import { resolveBlockAction } from '../shared/actions/blockActions'
import {
  GRID_COLUMN_COUNT,
  GRID_DEFAULT_ROW_COUNT,
  placementsOverlap,
} from '../shared/schema/gridLayout'
import {
  getChildOwnerSpan,
  isPlacementWithinSpan,
  validateBlockHierarchy,
} from '../shared/schema/blockHierarchy'
import { normalizeRepeaterProps } from '../shared/schema/repeater'
import type { Block, Project, RuntimeValueRef } from '../shared/schema/types'
import type { AiGenerationPlanIssue } from './aiTypes'

export function validateCompiledGenerationProject(
  project: Project,
  generatedPageIds: readonly string[],
): AiGenerationPlanIssue[] {
  const issues: AiGenerationPlanIssue[] = []
  const pagesById = new Map(project.pages.map((page) => [page.id, page]))
  const collections = project.dataCollections ?? []
  const collectionsById = new Map(collections.map((collection) => [collection.id, collection]))
  const generatedPageIdSet = new Set(generatedPageIds)

  validateUniqueValues(project.pages.map((page) => page.id), 'project.pages', 'page ID', issues)
  validateUniqueValues(project.pages.map((page) => page.path ?? ''), 'project.pages', 'page path', issues, true)
  validateUniqueValues(collections.map((collection) => collection.id), 'project.collections', 'collection ID', issues)

  for (const page of project.pages) {
    if (!generatedPageIdSet.has(page.id)) continue
    const pagePath = `project.pages.${page.id}`
    const blocksById = new Map(page.blocks.map((block) => [block.id, block]))

    for (const hierarchyIssue of validateBlockHierarchy(page.blocks)) {
      issues.push({
        code: hierarchyIssue.code,
        path: `${pagePath}.blocks.${hierarchyIssue.blockId}`,
        message: `Generated block hierarchy is invalid: ${hierarchyIssue.code}.`,
      })
    }

    const topLevel = page.blocks.filter((block) => !block.parentId)
    validateSiblingCollisions(topLevel, pagePath, issues)

    for (const block of page.blocks) {
      const grid = block.layout?.grid
      if (!grid) {
        issues.push({
          code: 'missing-grid',
          path: `${pagePath}.blocks.${block.id}.layout.grid`,
          message: 'Generated blocks require grid placement.',
        })
        continue
      }

      if (!block.parentId) {
        if (!isPlacementWithinSpan(grid, { cols: GRID_COLUMN_COUNT, rows: GRID_DEFAULT_ROW_COUNT })) {
          issues.push({
            code: 'page-overflow',
            path: `${pagePath}.blocks.${block.id}.layout.grid`,
            message: 'Generated block extends outside the page grid.',
          })
        }
      } else {
        const parent = blocksById.get(block.parentId)
        if (parent && !isPlacementWithinSpan(grid, getChildOwnerSpan(parent))) {
          issues.push({
            code: 'child-overflow',
            path: `${pagePath}.blocks.${block.id}.layout.grid`,
            message: 'Generated child extends outside its parent.',
          })
        }
      }

      validateBlockReferences(block, blocksById, pagesById, collectionsById, pagePath, issues)
    }

    const access = page.access
    if (access?.redirectPageId && !pagesById.has(access.redirectPageId)) {
      issues.push({
        code: 'missing-page-reference',
        path: `${pagePath}.access.redirectPageId`,
        message: 'Generated page access references a missing redirect page.',
      })
    }
  }

  validatePageAccessCycles(project, generatedPageIdSet, issues)
  return issues
}

function validateBlockReferences(
  block: Block,
  blocksById: ReadonlyMap<string, Block>,
  pagesById: ReadonlyMap<string, Project['pages'][number]>,
  collectionsById: ReadonlyMap<string, NonNullable<Project['dataCollections']>[number]>,
  pagePath: string,
  issues: AiGenerationPlanIssue[],
) {
  const blockPath = `${pagePath}.blocks.${block.id}`
  const action = resolveBlockAction(block)

  if (action?.type === 'navigate' && !pagesById.has(action.targetPageId)) {
    issues.push({
      code: 'missing-page-reference',
      path: `${blockPath}.props.action.targetPageId`,
      message: 'Generated navigation references a missing page.',
    })
  }

  if (action?.type === 'submitData') {
    const collection = action.collectionId ? collectionsById.get(action.collectionId) : undefined
    if (!collection) {
      issues.push({
        code: 'missing-collection-reference',
        path: `${blockPath}.props.action.collectionId`,
        message: 'Generated submission references a missing collection.',
      })
    }
    const collectionFieldKeys = new Set(collection?.fields.map((field) => field.key) ?? [])
    for (const field of action.fields) {
      const input = blocksById.get(field.fieldBlockId)
      if (!input || !isEditableField(input)) {
        issues.push({
          code: 'missing-field-block-reference',
          path: `${blockPath}.props.action.fields`,
          message: 'Generated submission references a missing or non-editable field block.',
        })
      }
      if (!field.targetFieldKey || !collectionFieldKeys.has(field.targetFieldKey)) {
        issues.push({
          code: 'missing-collection-field-reference',
          path: `${blockPath}.props.action.fields`,
          message: 'Generated submission references a missing collection field.',
        })
      }
    }
  }

  if (block.type === 'repeater') {
    const collectionId = normalizeRepeaterProps(block.props).collectionId
    if (!collectionsById.has(collectionId)) {
      issues.push({
        code: 'missing-collection-reference',
        path: `${blockPath}.props.collectionId`,
        message: 'Generated Collection List references a missing collection.',
      })
    }
  }

  for (const [property, binding] of Object.entries(block.bindings ?? {})) {
    validateBinding(block, property, binding, blocksById, collectionsById, blockPath, issues)
  }
}

function validateBinding(
  block: Block,
  property: string,
  binding: RuntimeValueRef,
  blocksById: ReadonlyMap<string, Block>,
  collectionsById: ReadonlyMap<string, NonNullable<Project['dataCollections']>[number]>,
  blockPath: string,
  issues: AiGenerationPlanIssue[],
) {
  if (binding.source !== 'collection') return
  const collection = collectionsById.get(binding.collectionId)
  if (!collection) {
    issues.push({
      code: 'missing-collection-reference',
      path: `${blockPath}.bindings.${property}`,
      message: 'Generated binding references a missing collection.',
    })
    return
  }
  if (!collection.fields.some((field) => field.id === binding.fieldId)) {
    issues.push({
      code: 'missing-collection-field-reference',
      path: `${blockPath}.bindings.${property}`,
      message: 'Generated binding references a missing collection field.',
    })
  }
  if (binding.record?.mode !== 'currentItem') return

  const parent = block.parentId ? blocksById.get(block.parentId) : undefined
  const parentCollectionId = parent?.type === 'repeater'
    ? normalizeRepeaterProps(parent.props).collectionId
    : ''
  if (!parent || parentCollectionId !== binding.collectionId) {
    issues.push({
      code: 'invalid-current-item-binding',
      path: `${blockPath}.bindings.${property}`,
      message: 'A current-item binding must be a child of a Collection List using the same collection.',
    })
  }
}

function validateSiblingCollisions(
  blocks: Block[],
  pagePath: string,
  issues: AiGenerationPlanIssue[],
) {
  for (let outer = 0; outer < blocks.length; outer += 1) {
    for (let inner = outer + 1; inner < blocks.length; inner += 1) {
      const first = blocks[outer]
      const second = blocks[inner]
      const firstGrid = first.layout?.grid
      const secondGrid = second.layout?.grid
      if (!firstGrid || !secondGrid || !placementsOverlap(firstGrid, secondGrid)) continue
      issues.push({
        code: 'block-collision',
        path: `${pagePath}.blocks.${second.id}.layout.grid`,
        message: 'Generated top-level blocks overlap.',
      })
    }
  }
}

function validatePageAccessCycles(
  project: Project,
  generatedPageIds: ReadonlySet<string>,
  issues: AiGenerationPlanIssue[],
) {
  const pagesById = new Map(project.pages.map((page) => [page.id, page]))
  for (const page of project.pages) {
    if (!generatedPageIds.has(page.id)) continue
    const visited = new Set<string>()
    let current = page
    while (current.access?.redirectPageId) {
      if (visited.has(current.id)) {
        issues.push({
          code: 'page-access-cycle',
          path: `project.pages.${page.id}.access`,
          message: 'Generated page access redirects contain a cycle.',
        })
        break
      }
      visited.add(current.id)
      const next = pagesById.get(current.access.redirectPageId)
      if (!next) break
      current = next
    }
  }
}

function validateUniqueValues(
  values: string[],
  path: string,
  label: string,
  issues: AiGenerationPlanIssue[],
  ignoreEmpty = false,
) {
  const seen = new Set<string>()
  for (const value of values) {
    if (ignoreEmpty && !value) continue
    if (seen.has(value)) {
      issues.push({
        code: 'duplicate-project-value',
        path,
        message: `Generated project contains a duplicate ${label}: ${value}.`,
      })
    }
    seen.add(value)
  }
}

function isEditableField(block: Block): boolean {
  if (block.type === 'checkbox' || block.type === 'toggle') return true
  return block.type === 'text' && block.props.editable === true
}
