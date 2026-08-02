import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AI_GENERATION_CAPABILITIES,
  parseAppGenerationPlan,
  type AppGenerationPlanV1,
} from '@apptura/shared/ai'
import { compileGenerationPlan } from '../../frontend/src/ai/compileGenerationPlan.js'
import { CREW_DIRECTORY_GENERATION_PLAN } from '../../frontend/src/ai/fixtures/crewDirectoryPlan.js'
import { placementsOverlap } from '../../frontend/src/shared/schema/gridLayout.js'
import { CURRENT_SCHEMA_VERSION } from '../../frontend/src/shared/schema/gridMigration.js'
import type { BlockAction, Project } from '../../frontend/src/shared/schema/types.js'

test('shared AI capability catalog matches the supported fixture contract', () => {
  assert.equal(AI_GENERATION_CAPABILITIES.catalogVersion, 1)
  assert.equal(AI_GENERATION_CAPABILITIES.planVersion, CREW_DIRECTORY_GENERATION_PLAN.planVersion)

  const fixtureBlockTypes = new Set(
    CREW_DIRECTORY_GENERATION_PLAN.pages.flatMap((page) => (
      page.blocks.map((block) => block.type)
    )),
  )
  fixtureBlockTypes.forEach((blockType) => {
    assert.ok(AI_GENERATION_CAPABILITIES.blockTypes.includes(blockType))
  })
})

test('strict plan parsing accepts the fixture and rejects unknown block properties', () => {
  const parsed = parseAppGenerationPlan(clone(CREW_DIRECTORY_GENERATION_PLAN))
  assert.equal(parsed.success, true)

  const invalid = clone(CREW_DIRECTORY_GENERATION_PLAN) as unknown as {
    pages: Array<{ blocks: Array<{ content: Record<string, unknown> }> }>
  }
  const invalidBlock = invalid.pages[0]?.blocks[0]
  if (invalidBlock) {
    invalidBlock.content = { ...invalidBlock.content, arbitraryCss: 'position: fixed' }
  }
  const rejected = parseAppGenerationPlan(invalid)
  assert.equal(rejected.success, false)
  if (rejected.success) return
  assert.ok(rejected.issues.some((issue) => (
    issue.code === 'unknown-property'
    && issue.path.endsWith('.content.arbitraryCss')
  )))
})

test('fixture compilation resolves IDs, collection bindings, navigation, and submission mappings', () => {
  const baseProject = createBaseProject()
  const parsed = parseAppGenerationPlan(clone(CREW_DIRECTORY_GENERATION_PLAN))
  assert.equal(parsed.success, true)
  if (!parsed.success) return

  const compiled = compileGenerationPlan(baseProject, parsed.data, {
    idFactory: sequentialIdFactory(),
  })
  assert.equal(compiled.success, true)
  if (!compiled.success) return

  const { proposal } = compiled
  assert.equal(baseProject.pages.length, 1, 'compilation must not mutate the source project')
  assert.equal(proposal.project.schemaVersion, CURRENT_SCHEMA_VERSION)
  assert.equal(proposal.generatedPageIds.length, 2)
  assert.equal(proposal.generatedCollectionIds.length, 1)
  assert.equal(proposal.generatedBlockCount, 12)
  assert.equal(proposal.repairs.length, 0)

  const addMemberButton = proposal.project.pages
    .flatMap((page) => page.blocks)
    .find((block) => block.type === 'button' && block.props.label === 'Add crew member')
  assert.deepEqual(addMemberButton?.layout?.grid, {
    colStart: 5,
    rowStart: 24,
    colSpan: 8,
    rowSpan: 2,
  })

  const collection = proposal.project.dataCollections?.find((candidate) => (
    proposal.generatedCollectionIds.includes(candidate.id)
  ))
  assert.ok(collection)
  assert.equal(collection.publicRead, true)
  assert.deepEqual(collection.fields.map((field) => field.key), ['name', 'role'])

  const directory = proposal.project.pages.find((page) => page.title === 'Crew Directory')
  const form = proposal.project.pages.find((page) => page.title === 'Add Crew Member')
  assert.ok(directory)
  assert.ok(form)
  assert.equal(directory.path, '/crew')
  assert.equal(form.path, '/crew-new')

  const repeater = directory.blocks.find((block) => block.type === 'repeater')
  assert.ok(repeater)
  assert.equal(repeater.props.collectionId, collection.id)
  const repeaterChildren = directory.blocks.filter((block) => block.parentId === repeater.id)
  assert.equal(repeaterChildren.length, 2)
  for (const child of repeaterChildren) {
    const binding = child.bindings?.value
    assert.equal(binding?.source, 'collection')
    if (binding?.source !== 'collection') continue
    assert.equal(binding.collectionId, collection.id)
    assert.equal(binding.record?.mode, 'currentItem')
  }

  const openFormButton = directory.blocks.find((block) => block.props.label === 'Add crew member')
  assert.deepEqual(readAction(openFormButton), { type: 'navigate', targetPageId: form.id })

  const submitButton = form.blocks.find((block) => block.props.label === 'Save profile')
  const submitAction = readAction(submitButton)
  assert.equal(submitAction?.type, 'submitData')
  if (submitAction?.type === 'submitData') {
    assert.equal(submitAction.collectionId, collection.id)
    assert.deepEqual(submitAction.fields.map((field) => field.targetFieldKey), ['name', 'role'])
    for (const field of submitAction.fields) {
      assert.ok(form.blocks.some((block) => block.id === field.fieldBlockId && block.props.editable === true))
    }
  }
})

test('layout compilation clamps out-of-bounds coordinates and reports the repair', () => {
  const fixture = clone(CREW_DIRECTORY_GENERATION_PLAN) as AppGenerationPlanV1
  fixture.pages[0].blocks[0].grid.colStart = 20
  const parsed = parseAppGenerationPlan(fixture)
  assert.equal(parsed.success, true)
  if (!parsed.success) return

  const compiled = compileGenerationPlan(createBaseProject(), parsed.data, {
    idFactory: sequentialIdFactory(),
  })
  assert.equal(compiled.success, true)
  if (!compiled.success) return
  assert.ok(compiled.proposal.repairs.some((repair) => (
    repair.blockKey === 'directory-title'
    && repair.reason === 'clamped-to-grid'
  )))

  const page = compiled.proposal.project.pages.find((candidate) => candidate.title === 'Crew Directory')
  assert.ok(page)
  const topLevel = page.blocks.filter((block) => !block.parentId)
  for (let outer = 0; outer < topLevel.length; outer += 1) {
    for (let inner = outer + 1; inner < topLevel.length; inner += 1) {
      const first = topLevel[outer]?.layout?.grid
      const second = topLevel[inner]?.layout?.grid
      assert.ok(first && second)
      assert.equal(placementsOverlap(first, second), false)
    }
  }
})

test('compilation rejects unresolved semantic references instead of emitting broken project JSON', () => {
  const fixture = clone(CREW_DIRECTORY_GENERATION_PLAN) as AppGenerationPlanV1
  const button = fixture.pages[0].blocks.find((block) => block.key === 'open-add-member')
  if (button?.type === 'button' && button.action?.type === 'navigate') {
    button.action.targetPageKey = 'missing-page'
  }
  const parsed = parseAppGenerationPlan(fixture)
  assert.equal(parsed.success, true)
  if (!parsed.success) return

  const compiled = compileGenerationPlan(createBaseProject(), parsed.data, {
    idFactory: sequentialIdFactory(),
  })
  assert.equal(compiled.success, false)
  if (compiled.success) return
  assert.ok(compiled.issues.some((issue) => (
    issue.code === 'missing-reference'
    && issue.message.includes('missing-page')
  )))
})

function createBaseProject(): Project {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: 'project-1',
    name: 'Existing Project',
    dataCollections: [],
    pages: [{
      id: 'home-page',
      title: 'Home',
      path: '/home',
      appearance: { backgroundColor: '#ffffff' },
      access: { mode: 'public' },
      blocks: [],
    }],
  }
}

function sequentialIdFactory() {
  let index = 0
  return () => `generated-id-${++index}`
}

function readAction(block: { props: Record<string, unknown> } | undefined): BlockAction | null {
  return (block?.props.action as BlockAction | undefined) ?? null
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
