import { normalizeGeneratedPageLayout, type AiGenerationLayoutRepair } from './generationLayout'
import { repairGeneratedBlockColors } from './generationColors'
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
  project: Project
  generatedPageIds: string[]
  generatedCollectionIds: string[]
  generatedBlockCount: number
  repairs: AiGenerationLayoutRepair[]
}

export type CompileGenerationPlanResult =
  | { success: true; proposal: AiGenerationProposal }
  | { success: false; issues: AiGenerationPlanIssue[] }

type CompileOptions = {
  idFactory?: () => string
}

export function compileGenerationPlan(
  baseProject: Project,
  plan: AppGenerationPlanV1,
  options: CompileOptions = {},
): CompileGenerationPlanResult {
  const issues: AiGenerationPlanIssue[] = []
  const repairs: AiGenerationLayoutRepair[] = []
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

  const generatedCollections = compileCollections(
    baseProject.dataCollections ?? [],
    plan,
    collectionIdByKey,
    fieldIdByCollectionAndKey,
  )
  const generatedPages: Page[] = []
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
        blockIdByPageAndKey,
        pageIdByKey,
        collectionIdByKey,
        fieldIdByCollectionAndKey,
        plan,
        issues,
      )
      if (block) blockKeyById.set(block.id, blockPlan.key)
      return block
    }).filter((block): block is Block => block !== null)

    const layout = normalizeGeneratedPageLayout(pagePlan.key, rawBlocks, blockKeyById)
    repairs.push(...layout.repairs)
    issues.push(...layout.issues)

    const access = compilePageAccess(pagePlan, pageIdByKey, issues)
    const page: Page = {
      id: pageId,
      title: pagePlan.title,
      path: pagePath,
      appearance: { backgroundColor: pagePlan.backgroundColor ?? '#ffffff' },
      access,
      blocks: layout.blocks,
    }
    generatedPages.push(page)
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
      project,
      generatedPageIds: generatedPages.map((page) => page.id),
      generatedCollectionIds: generatedCollections.map((collection) => collection.id),
      generatedBlockCount: generatedPages.reduce((count, page) => count + page.blocks.length, 0),
      repairs,
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
  collectionIdByKey: ReadonlyMap<string, string>,
  fieldIdByCollectionAndKey: ReadonlyMap<string, string>,
  plan: AppGenerationPlanV1,
  issues: AiGenerationPlanIssue[],
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

  const props = repairGeneratedBlockColors(
    pagePlan,
    blockPlan,
    compileBlockProps(
      pagePlan,
      blockPlan,
      blockIdByPageAndKey,
      pageIdByKey,
      collectionIdByKey,
      plan,
      issues,
    ),
  )
  const base = createBlock(blockPlan.type, props)
  const bindings = compileBlockBindings(
    pagePlan,
    blockPlan,
    collectionIdByKey,
    fieldIdByCollectionAndKey,
    plan,
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
  collectionIdByKey: ReadonlyMap<string, string>,
  plan: AppGenerationPlanV1,
  issues: AiGenerationPlanIssue[],
): Record<string, unknown> {
  if (blockPlan.type === 'hero') return { ...blockPlan.content }
  if (blockPlan.type === 'text') return { ...blockPlan.content }

  if (blockPlan.type === 'repeater') {
    const collectionId = collectionIdByKey.get(blockPlan.collectionKey)
    if (!collectionId) {
      issues.push(missingReference(
        `pages.${pagePlan.key}.blocks.${blockPlan.key}.collectionKey`,
        `Unknown collection key "${blockPlan.collectionKey}".`,
      ))
    }
    return {
      ...(blockPlan.content || {}),
      collectionId: collectionId ?? '',
    }
  }

  const action = blockPlan.action
    ? compileButtonAction(
        pagePlan,
        blockPlan.key,
        blockPlan.action,
        blockIdByPageAndKey,
        pageIdByKey,
        collectionIdByKey,
        plan,
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
  collectionIdByKey: ReadonlyMap<string, string>,
  plan: AppGenerationPlanV1,
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

  const collectionId = collectionIdByKey.get(actionPlan.collectionKey)
  const collection = plan.collections.find((candidate) => candidate.key === actionPlan.collectionKey)
  if (!collectionId || !collection) {
    issues.push(missingReference(path, `Unknown collection key "${actionPlan.collectionKey}".`))
    return null
  }

  const fields = actionPlan.fields.flatMap((field) => {
    const fieldBlockId = blockIdByPageAndKey.get(pageBlockMapKey(pagePlan.key, field.fieldBlockKey))
    const targetFieldExists = collection.fields.some((candidate) => candidate.key === field.targetFieldKey)
    if (!fieldBlockId) {
      issues.push(missingReference(path, `Unknown field block key "${field.fieldBlockKey}".`))
      return []
    }
    if (!targetFieldExists) {
      issues.push(missingReference(path, `Unknown collection field key "${field.targetFieldKey}".`))
      return []
    }
    return [{ fieldBlockId, targetFieldKey: field.targetFieldKey }]
  })

  return { type: 'submitData', collectionId, fields }
}

function compileBlockBindings(
  pagePlan: AiPagePlan,
  blockPlan: AiBlockPlan,
  collectionIdByKey: ReadonlyMap<string, string>,
  fieldIdByCollectionAndKey: ReadonlyMap<string, string>,
  plan: AppGenerationPlanV1,
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
    bindingPlan,
    `pages.${pagePlan.key}.blocks.${blockPlan.key}.${property}Binding`,
    collectionIdByKey,
    fieldIdByCollectionAndKey,
    plan,
    issues,
  )
  return binding ? { [property]: binding } : undefined
}

function compileCollectionBinding(
  bindingPlan: AiCollectionBindingPlan,
  path: string,
  collectionIdByKey: ReadonlyMap<string, string>,
  fieldIdByCollectionAndKey: ReadonlyMap<string, string>,
  plan: AppGenerationPlanV1,
  issues: AiGenerationPlanIssue[],
): RuntimeValueRef | null {
  const collection = plan.collections.find((candidate) => candidate.key === bindingPlan.collectionKey)
  const collectionId = collectionIdByKey.get(bindingPlan.collectionKey)
  const field = collection?.fields.find((candidate) => candidate.key === bindingPlan.fieldKey)
  const fieldId = fieldIdByCollectionAndKey.get(
    collectionFieldMapKey(bindingPlan.collectionKey, bindingPlan.fieldKey),
  )

  if (!collection || !collectionId) {
    issues.push(missingReference(path, `Unknown collection key "${bindingPlan.collectionKey}".`))
    return null
  }
  if (!field || !fieldId) {
    issues.push(missingReference(path, `Unknown collection field key "${bindingPlan.fieldKey}".`))
    return null
  }

  return {
    source: 'collection',
    collectionId,
    fieldId,
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
