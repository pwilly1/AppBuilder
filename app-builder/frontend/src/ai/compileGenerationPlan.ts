import { normalizeGeneratedPageLayout, type AiGenerationLayoutRepair } from './generationLayout'
import { createRenderedReviewPage } from './generationReview'
import { repairGeneratedBlockColors } from './generationColors'
import {
  normalizeGeneratedPageComposition,
  type AiGenerationCompositionRepair,
  type AiGenerationVisualIssue,
} from './generationAesthetics'
import {
  applyGeneratedVisualStyle,
  resolveGeneratedPageBackground,
} from './generationTheme'
import { validateCompiledGenerationProject } from './validateGenerationProposal'
import type {
  AiBlockPlan,
  AiCollectionAccessPreset,
  AiCollectionBindingPlan,
  AiGenerationPlanIssue,
  AiPagePlan,
  AppGenerationPlanV1,
} from '@apptura/shared/ai'
import { createBlock } from '../shared/schema/registry'
import { CURRENT_SCHEMA_VERSION } from '../shared/schema/gridMigration'
import type {
  AppDataCollection,
  AppDataCollectionAccess,
  Block,
  BlockAction,
  BlockBindings,
  Page,
  Project,
  RuntimeValueRef,
} from '../shared/schema/types'
import { slugify, uniquePath } from '../hooks/project/projectUtils'

export type AiGenerationProposal = {
  plan: AppGenerationPlanV1
  visualReviewPlan: AppGenerationPlanV1
  project: Project
  generatedPageIds: string[]
  generatedCollectionIds: string[]
  generatedBlockCount: number
  repairs: AiGenerationLayoutRepair[]
  compositionRepairs: AiGenerationCompositionRepair[]
  visualWarnings: AiGenerationVisualIssue[]
}

export type CompileGenerationPlanResult =
  | { success: true; proposal: AiGenerationProposal }
  | { success: false; issues: AiGenerationPlanIssue[] }

type CompileOptions = {
  idFactory?: () => string
  preservePresentation?: boolean
}

type CollectionReference = {
  id: string
  fields: AppDataCollection['fields']
}

export function compileGenerationPlan(
  baseProject: Project,
  plan: AppGenerationPlanV1,
  options: CompileOptions = {},
): CompileGenerationPlanResult {
  const issues: AiGenerationPlanIssue[] = []
  const repairs: AiGenerationLayoutRepair[] = []
  const compositionRepairs: AiGenerationCompositionRepair[] = []
  const visualWarnings: AiGenerationVisualIssue[] = []
  const idFactory = options.idFactory ?? (() => crypto.randomUUID())
  const usedIds = collectProjectIds(baseProject)
  const nextId = () => createUniqueId(idFactory, usedIds)

  const collectionIdByKey = new Map<string, string>()
  const fieldIdByCollectionAndKey = new Map<string, string>()
  const pageIdByKey = new Map<string, string>()
  const blockIdByPageAndKey = new Map<string, string>()

  for (const collection of plan.collections) {
    const collectionId = nextId()
    collectionIdByKey.set(collection.key, collectionId)
    for (const field of collection.fields) {
      fieldIdByCollectionAndKey.set(collectionFieldMapKey(collection.key, field.key), nextId())
    }
  }
  for (const page of plan.pages) {
    pageIdByKey.set(page.key, nextId())
    for (const block of page.blocks) {
      blockIdByPageAndKey.set(pageBlockMapKey(page.key, block.key), nextId())
    }
  }
  const pageReferenceIdByKey = buildPageReferenceIdMap(
    baseProject.pages,
    plan.pages,
    pageIdByKey,
  )
  const blockReferenceIdByPageAndKey = buildBlockReferenceIdMap(
    plan.pages,
    blockIdByPageAndKey,
  )

  const generatedCollections = compileCollections(
    baseProject.dataCollections ?? [],
    plan,
    collectionIdByKey,
    fieldIdByCollectionAndKey,
  )
  const collectionReferenceByKey = buildCollectionReferenceMap(
    baseProject.dataCollections ?? [],
    generatedCollections,
    plan,
    collectionIdByKey,
  )
  const generatedPages: Page[] = []
  const renderedPlans: AiPagePlan[] = []
  const usedPages = [...baseProject.pages]

  for (const pagePlan of plan.pages) {
    const pageId = pageIdByKey.get(pagePlan.key)
    if (!pageId) {
      issues.push(missingReference(`pages.${pagePlan.key}`, 'Generated page ID could not be allocated.'))
      continue
    }

    const pathBase = slugify((pagePlan.path ?? pagePlan.title).replace(/[\\/]+/g, ' ')) || 'page'
    const pagePath = uniquePath(pathBase, usedPages)
    const blockKeyById = new Map<string, string>()
    const rawBlocks = pagePlan.blocks.map((blockPlan) => {
      const block = compileBlock(
        pagePlan,
        blockPlan,
        blockReferenceIdByPageAndKey,
        pageReferenceIdByKey,
        collectionReferenceByKey,
        issues,
        options.preservePresentation,
      )
      if (block) blockKeyById.set(block.id, blockPlan.key)
      return block
    }).filter((block): block is Block => block !== null)

    // Reviewed coordinates already describe the screenshot; validate them without recomposing.
    const layout = options.preservePresentation
      ? { blocks: rawBlocks, repairs: [], issues: [] }
      : normalizeGeneratedPageLayout(pagePlan.key, rawBlocks, blockKeyById)
    repairs.push(...layout.repairs)
    issues.push(...layout.issues)
    const composition = options.preservePresentation
      ? { blocks: layout.blocks, repairs: [], warnings: [], issues: [] }
      : normalizeGeneratedPageComposition(
          pagePlan,
          layout.blocks,
          blockKeyById,
        )
    compositionRepairs.push(...composition.repairs)
    visualWarnings.push(...composition.warnings)
    issues.push(...composition.issues)

    const access = compilePageAccess(pagePlan, pageReferenceIdByKey, issues)
    const page: Page = {
      id: pageId,
      title: pagePlan.title,
      path: pagePath,
      appearance: { backgroundColor: resolveGeneratedPageBackground(pagePlan) },
      access,
      blocks: composition.blocks,
    }
    generatedPages.push(page)
    renderedPlans.push(createRenderedReviewPage(pagePlan, page, blockKeyById))
    usedPages.push(page)
  }

  const project: Project = {
    ...cloneProject(baseProject),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    dataCollections: [
      ...(baseProject.dataCollections ?? []).map(cloneValue),
      ...generatedCollections,
    ],
    pages: [
      ...baseProject.pages.map(cloneValue),
      ...generatedPages,
    ],
  }

  issues.push(...validateCompiledGenerationProject(
    project,
    generatedPages.map((page) => page.id),
  ))
  if (issues.length) return { success: false, issues: dedupeIssues(issues) }

  return {
    success: true,
    proposal: {
      plan,
      visualReviewPlan: { ...plan, pages: renderedPlans },
      project,
      generatedPageIds: generatedPages.map((page) => page.id),
      generatedCollectionIds: generatedCollections.map((collection) => collection.id),
      generatedBlockCount: generatedPages.reduce((count, page) => count + page.blocks.length, 0),
      repairs,
      compositionRepairs,
      visualWarnings,
    },
  }
}

function compileCollections(
  existingCollections: AppDataCollection[],
  plan: AppGenerationPlanV1,
  collectionIdByKey: ReadonlyMap<string, string>,
  fieldIdByCollectionAndKey: ReadonlyMap<string, string>,
): AppDataCollection[] {
  const usedNames = new Set(existingCollections.map((collection) => collection.name.toLowerCase()))
  return plan.collections.map((collectionPlan) => {
    const name = uniqueName(collectionPlan.name, usedNames)
    const access = getCollectionAccess(collectionPlan.accessPreset)
    return {
      id: requireMapValue(collectionIdByKey, collectionPlan.key),
      name,
      publicRead: access.read === 'public',
      access,
      fields: collectionPlan.fields.map((field) => ({
        id: requireMapValue(
          fieldIdByCollectionAndKey,
          collectionFieldMapKey(collectionPlan.key, field.key),
        ),
        key: field.key,
        label: field.label,
        type: field.type,
        ...(field.required === undefined ? {} : { required: field.required }),
      })),
    }
  })
}

function compileBlock(
  pagePlan: AiPagePlan,
  blockPlan: AiBlockPlan,
  blockIdByPageAndKey: ReadonlyMap<string, string>,
  pageIdByKey: ReadonlyMap<string, string>,
  collectionReferenceByKey: ReadonlyMap<string, CollectionReference>,
  issues: AiGenerationPlanIssue[],
  preservePresentation = false,
): Block | null {
  const id = blockIdByPageAndKey.get(pageBlockMapKey(pagePlan.key, blockPlan.key))
  if (!id) {
    issues.push(missingReference(
      `pages.${pagePlan.key}.blocks.${blockPlan.key}`,
      'Generated block ID could not be allocated.',
    ))
    return null
  }

  const parentId = blockPlan.parentKey
    ? blockIdByPageAndKey.get(pageBlockMapKey(pagePlan.key, blockPlan.parentKey))
    : undefined
  if (blockPlan.parentKey && !parentId) {
    issues.push(missingReference(
      `pages.${pagePlan.key}.blocks.${blockPlan.key}.parentKey`,
      `Unknown parent block key "${blockPlan.parentKey}".`,
    ))
  }

  const compiledProps = compileBlockProps(
    pagePlan,
    blockPlan,
    blockIdByPageAndKey,
    pageIdByKey,
    collectionReferenceByKey,
    issues,
  )
  const props = repairGeneratedBlockColors(
    pagePlan,
    blockPlan,
    preservePresentation
      ? { ...applyGeneratedVisualStyle(pagePlan, blockPlan, compiledProps), ...compiledProps }
      : applyGeneratedVisualStyle(pagePlan, blockPlan, compiledProps),
  )
  const base = createBlock(blockPlan.type, props)
  const bindings = compileBlockBindings(
    pagePlan,
    blockPlan,
    collectionReferenceByKey,
    issues,
  )

  return {
    ...base,
    id,
    ...(parentId ? { parentId } : {}),
    ...(bindings ? { bindings } : {}),
    layout: {
      ...(base.layout || {}),
      grid: { ...blockPlan.grid },
    },
    render: {
      ...(base.render || {}),
      ...(blockPlan.render || {}),
    },
  }
}

function compileBlockProps(
  pagePlan: AiPagePlan,
  blockPlan: AiBlockPlan,
  blockIdByPageAndKey: ReadonlyMap<string, string>,
  pageIdByKey: ReadonlyMap<string, string>,
  collectionReferenceByKey: ReadonlyMap<string, CollectionReference>,
  issues: AiGenerationPlanIssue[],
): Record<string, unknown> {
  if (blockPlan.type === 'hero') return { ...blockPlan.content }
  if (blockPlan.type === 'text') return { ...blockPlan.content }

  if (blockPlan.type === 'repeater') {
    const collection = resolveReference(collectionReferenceByKey, blockPlan.collectionKey)
    if (!collection) {
      issues.push(missingReference(
        `pages.${pagePlan.key}.blocks.${blockPlan.key}.collectionKey`,
        `Unknown collection key "${blockPlan.collectionKey}".`,
      ))
    }
    return {
      ...(blockPlan.content || {}),
      collectionId: collection?.id ?? '',
    }
  }

  const action = blockPlan.action
    ? compileButtonAction(
        pagePlan,
        blockPlan.key,
        blockPlan.action,
        blockIdByPageAndKey,
        pageIdByKey,
        collectionReferenceByKey,
        issues,
      )
    : null
  return {
    ...blockPlan.content,
    ...(action ? { action } : {}),
  }
}

function compileButtonAction(
  pagePlan: AiPagePlan,
  blockKey: string,
  actionPlan: NonNullable<Extract<AiBlockPlan, { type: 'button' }>['action']>,
  blockIdByPageAndKey: ReadonlyMap<string, string>,
  pageIdByKey: ReadonlyMap<string, string>,
  collectionReferenceByKey: ReadonlyMap<string, CollectionReference>,
  issues: AiGenerationPlanIssue[],
): BlockAction | null {
  const path = `pages.${pagePlan.key}.blocks.${blockKey}.action`
  if (actionPlan.type === 'navigate') {
    const targetPageId = pageIdByKey.get(actionPlan.targetPageKey)
    if (!targetPageId) {
      issues.push(missingReference(path, `Unknown target page key "${actionPlan.targetPageKey}".`))
      return null
    }
    return { type: 'navigate', targetPageId }
  }

  const collection = resolveReference(collectionReferenceByKey, actionPlan.collectionKey)
  if (!collection) {
    issues.push(missingReference(path, `Unknown collection key "${actionPlan.collectionKey}".`))
    return null
  }

  const fields = actionPlan.fields.flatMap((field) => {
    const fieldBlockId = resolvePageBlockReference(
      blockIdByPageAndKey,
      pagePlan.key,
      field.fieldBlockKey,
    )
    const targetField = resolveCollectionField(collection, field.targetFieldKey)
    if (!fieldBlockId) {
      issues.push(missingReference(path, `Unknown field block key "${field.fieldBlockKey}".`))
      return []
    }
    if (!targetField) {
      issues.push(missingReference(path, `Unknown collection field key "${field.targetFieldKey}".`))
      return []
    }
    return [{ fieldBlockId, targetFieldKey: targetField.key }]
  })

  return { type: 'submitData', collectionId: collection.id, fields }
}

function compileBlockBindings(
  pagePlan: AiPagePlan,
  blockPlan: AiBlockPlan,
  collectionReferenceByKey: ReadonlyMap<string, CollectionReference>,
  issues: AiGenerationPlanIssue[],
): BlockBindings | undefined {
  const bindingPlan = blockPlan.type === 'hero'
    ? blockPlan.headlineBinding
    : blockPlan.type === 'text'
      ? blockPlan.valueBinding
      : undefined
  if (!bindingPlan) return undefined

  const property = blockPlan.type === 'hero' ? 'headline' : 'value'
  const binding = compileCollectionBinding(
    blockPlan.parentKey || bindingPlan.record !== 'currentItem'
      ? bindingPlan
      : { ...bindingPlan, record: 'latest' },
    `pages.${pagePlan.key}.blocks.${blockPlan.key}.${property}Binding`,
    collectionReferenceByKey,
    issues,
  )
  return binding ? { [property]: binding } : undefined
}

function compileCollectionBinding(
  bindingPlan: AiCollectionBindingPlan,
  path: string,
  collectionReferenceByKey: ReadonlyMap<string, CollectionReference>,
  issues: AiGenerationPlanIssue[],
): RuntimeValueRef | null {
  const collection = resolveReference(collectionReferenceByKey, bindingPlan.collectionKey)
  const field = collection ? resolveCollectionField(collection, bindingPlan.fieldKey) : undefined

  if (!collection) {
    issues.push(missingReference(path, `Unknown collection key "${bindingPlan.collectionKey}".`))
    return null
  }
  if (!field) {
    issues.push(missingReference(path, `Unknown collection field key "${bindingPlan.fieldKey}".`))
    return null
  }

  return {
    source: 'collection',
    collectionId: collection.id,
    fieldId: field.id,
    record: { mode: bindingPlan.record },
    ...(bindingPlan.fallback === undefined ? {} : { fallback: bindingPlan.fallback }),
  }
}

function compilePageAccess(
  pagePlan: AiPagePlan,
  pageIdByKey: ReadonlyMap<string, string>,
  issues: AiGenerationPlanIssue[],
): Page['access'] {
  const access = pagePlan.access ?? { mode: 'public' as const }
  if (!access.redirectPageKey) return { mode: access.mode }
  const redirectPageId = pageIdByKey.get(access.redirectPageKey)
  if (!redirectPageId) {
    issues.push(missingReference(
      `pages.${pagePlan.key}.access.redirectPageKey`,
      `Unknown redirect page key "${access.redirectPageKey}".`,
    ))
    return { mode: access.mode }
  }
  return { mode: access.mode, redirectPageId }
}

function getCollectionAccess(preset: AiCollectionAccessPreset): AppDataCollectionAccess {
  if (preset === 'authenticated-own-records') {
    return { create: 'authenticated', read: 'own', update: 'own', delete: 'own' }
  }
  if (preset === 'private-submissions') {
    return { create: 'anyone', read: 'none', update: 'none', delete: 'none' }
  }
  return { create: 'anyone', read: 'public', update: 'own', delete: 'own' }
}

function uniqueName(base: string, usedNames: Set<string>): string {
  const normalizedBase = base.trim() || 'Generated Data'
  let candidate = normalizedBase
  let suffix = 2
  while (usedNames.has(candidate.toLowerCase())) {
    candidate = `${normalizedBase} ${suffix}`
    suffix += 1
  }
  usedNames.add(candidate.toLowerCase())
  return candidate
}

function buildPageReferenceIdMap(
  existingPages: Page[],
  generatedPages: AiPagePlan[],
  generatedIdByKey: ReadonlyMap<string, string>,
): Map<string, string> {
  const references = new Map(generatedIdByKey)
  const reservedKeys = new Set(generatedIdByKey.keys())
  const ambiguousAliases = new Set<string>()
  const addAlias = (alias: string, pageId: string) => {
    if (!alias || ambiguousAliases.has(alias)) return
    const current = references.get(alias)
    if (!current || current === pageId) {
      references.set(alias, pageId)
      return
    }
    if (reservedKeys.has(alias)) return
    references.delete(alias)
    ambiguousAliases.add(alias)
  }

  for (const page of generatedPages) {
    const pageId = generatedIdByKey.get(page.key)
    if (!pageId) continue
    pageReferenceAliases(page.title ?? '', page.path).forEach((alias) => addAlias(alias, pageId))
  }
  for (const page of existingPages) {
    const pageId = page.id
    if (!pageId) continue
    pageReferenceAliases(page.title ?? '', page.path).forEach((alias) => addAlias(alias, pageId))
  }
  return references
}

function pageReferenceAliases(title: string, path?: string): string[] {
  return [...new Set([
    slugify(title),
    path ? slugify(path.replace(/[\\/]+/g, ' ')) : '',
  ].filter(Boolean))]
}

function buildBlockReferenceIdMap(
  pages: AiPagePlan[],
  blockIdByPageAndKey: ReadonlyMap<string, string>,
): Map<string, string> {
  const references = new Map(blockIdByPageAndKey)
  const protectedKeys = new Set(blockIdByPageAndKey.keys())
  const ambiguousAliases = new Set<string>()

  for (const page of pages) {
    for (const block of page.blocks) {
      const blockId = blockIdByPageAndKey.get(pageBlockMapKey(page.key, block.key))
      if (!blockId) continue
      const aliases = block.type === 'text'
        ? [block.content.fieldKey, block.content.fieldLabel]
        : []
      for (const alias of aliases) {
        if (!alias) continue
        addUniqueStringReference(
          references,
          pageBlockMapKey(page.key, normalizeReferenceAlias(alias)),
          blockId,
          protectedKeys,
          ambiguousAliases,
        )
      }
    }
  }
  return references
}

function buildCollectionReferenceMap(
  existingCollections: AppDataCollection[],
  generatedCollections: AppDataCollection[],
  plan: AppGenerationPlanV1,
  generatedIdByKey: ReadonlyMap<string, string>,
): Map<string, CollectionReference> {
  const references = new Map<string, CollectionReference>()
  const protectedKeys = new Set(plan.collections.map((collection) => collection.key))
  const ambiguousAliases = new Set<string>()

  for (const collectionPlan of plan.collections) {
    const collectionId = generatedIdByKey.get(collectionPlan.key)
    const collection = generatedCollections.find((candidate) => candidate.id === collectionId)
    if (!collection) continue
    const reference = { id: collection.id, fields: collection.fields }
    references.set(collectionPlan.key, reference)
    addUniqueCollectionReference(
      references,
      normalizeReferenceAlias(collection.name),
      reference,
      protectedKeys,
      ambiguousAliases,
    )
  }
  for (const collection of existingCollections) {
    addUniqueCollectionReference(
      references,
      normalizeReferenceAlias(collection.name),
      { id: collection.id, fields: collection.fields },
      protectedKeys,
      ambiguousAliases,
    )
  }
  return references
}

function addUniqueStringReference(
  references: Map<string, string>,
  alias: string,
  value: string,
  protectedKeys: ReadonlySet<string>,
  ambiguousAliases: Set<string>,
): void {
  if (!alias || ambiguousAliases.has(alias)) return
  const current = references.get(alias)
  if (!current || current === value) {
    references.set(alias, value)
    return
  }
  if (protectedKeys.has(alias)) return
  references.delete(alias)
  ambiguousAliases.add(alias)
}

function addUniqueCollectionReference(
  references: Map<string, CollectionReference>,
  alias: string,
  value: CollectionReference,
  protectedKeys: ReadonlySet<string>,
  ambiguousAliases: Set<string>,
): void {
  if (!alias || ambiguousAliases.has(alias)) return
  const current = references.get(alias)
  if (!current || current.id === value.id) {
    references.set(alias, value)
    return
  }
  if (protectedKeys.has(alias)) return
  references.delete(alias)
  ambiguousAliases.add(alias)
}

function resolvePageBlockReference(
  references: ReadonlyMap<string, string>,
  pageKey: string,
  blockKey: string,
): string | undefined {
  return references.get(pageBlockMapKey(pageKey, blockKey))
    ?? references.get(pageBlockMapKey(pageKey, normalizeReferenceAlias(blockKey)))
}

function resolveReference<T>(references: ReadonlyMap<string, T>, key: string): T | undefined {
  return references.get(key) ?? references.get(normalizeReferenceAlias(key))
}

function resolveCollectionField(
  collection: CollectionReference,
  requestedKey: string,
): CollectionReference['fields'][number] | undefined {
  const exact = collection.fields.find((field) => field.key === requestedKey)
  if (exact) return exact
  const alias = normalizeReferenceAlias(requestedKey)
  const matches = collection.fields.filter((field) => (
    normalizeReferenceAlias(field.key) === alias
    || normalizeReferenceAlias(field.label) === alias
  ))
  return matches.length === 1 ? matches[0] : undefined
}

function normalizeReferenceAlias(value: string): string {
  return slugify(value.replace(/[_\\/]+/g, ' '))
}

function collectProjectIds(project: Project): Set<string> {
  const ids = new Set<string>([project.id])
  for (const collection of project.dataCollections ?? []) {
    ids.add(collection.id)
    collection.fields.forEach((field) => ids.add(field.id))
  }
  for (const page of project.pages) {
    ids.add(page.id)
    page.stateVariables?.forEach((variable) => ids.add(variable.id))
    page.blocks.forEach((block) => ids.add(block.id))
  }
  return ids
}

function createUniqueId(idFactory: () => string, usedIds: Set<string>): string {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const id = idFactory().trim()
    if (!id || usedIds.has(id)) continue
    usedIds.add(id)
    return id
  }
  throw new Error('AI generation could not allocate a unique project identifier.')
}

function collectionFieldMapKey(collectionKey: string, fieldKey: string): string {
  return `${collectionKey}:${fieldKey}`
}

function pageBlockMapKey(pageKey: string, blockKey: string): string {
  return `${pageKey}:${blockKey}`
}

function requireMapValue(map: ReadonlyMap<string, string>, key: string): string {
  const value = map.get(key)
  if (!value) throw new Error(`Missing generated identifier for ${key}.`)
  return value
}

function missingReference(path: string, message: string): AiGenerationPlanIssue {
  return { code: 'missing-reference', path, message }
}

function dedupeIssues(issues: AiGenerationPlanIssue[]): AiGenerationPlanIssue[] {
  const seen = new Set<string>()
  return issues.filter((issue) => {
    const key = `${issue.code}:${issue.path}:${issue.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function cloneProject(project: Project): Project {
  return cloneValue(project)
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
