import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AI_GENERATION_CAPABILITIES,
  parseAppGenerationPlan,
  type AppGenerationPlanV1,
} from '@apptura/shared/ai'
import { compileGenerationPlan } from '../../frontend/src/ai/compileGenerationPlan.js'
import { getColorContrastRatio } from '../../frontend/src/ai/generationColors.js'
import { CREW_DIRECTORY_GENERATION_PLAN } from '../../frontend/src/ai/fixtures/crewDirectoryPlan.js'
import { placementsOverlap } from '../../frontend/src/shared/schema/gridLayout.js'
import { CURRENT_SCHEMA_VERSION } from '../../frontend/src/shared/schema/gridMigration.js'
import type { BlockAction, Project } from '../../frontend/src/shared/schema/types.js'
import { AI_VISUAL_PROMPT_CORPUS } from './fixtures/aiVisualPromptCorpus.js'

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

test('visual prompt evaluation corpus remains broad, unique, and contract-supported', () => {
  assert.equal(AI_VISUAL_PROMPT_CORPUS.length, 12)
  assert.equal(new Set(AI_VISUAL_PROMPT_CORPUS.map((entry) => entry.id)).size, 12)
  assert.equal(new Set(AI_VISUAL_PROMPT_CORPUS.map((entry) => entry.prompt)).size, 12)
  for (const entry of AI_VISUAL_PROMPT_CORPUS) {
    assert.ok(entry.prompt.length >= 40)
    assert.ok(entry.visualFocus.length >= 30)
    assert.ok(AI_GENERATION_CAPABILITIES.densities.includes(entry.expectedDensity))
    entry.expectedSectionPatterns.forEach((pattern) => {
      assert.ok(AI_GENERATION_CAPABILITIES.sectionPatterns.includes(pattern))
    })
  }
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

test('strict plan parsing rejects invalid visual roles but accepts repairable section metadata', () => {
  const invalidRole = clone(CREW_DIRECTORY_GENERATION_PLAN) as unknown as {
    pages: Array<{ blocks: Array<{ visualRole?: string }> }>
  }
  invalidRole.pages[0]!.blocks[0]!.visualRole = 'field'
  const roleResult = parseAppGenerationPlan(invalidRole)
  assert.equal(roleResult.success, false)
  if (!roleResult.success) {
    assert.ok(roleResult.issues.some((issue) => issue.code === 'invalid-visual-role'))
  }

  const duplicateMember = clone(CREW_DIRECTORY_GENERATION_PLAN) as unknown as {
    pages: Array<{ sections: Array<{ blockKeys: string[] }> }>
  }
  duplicateMember.pages[0]!.sections[1]!.blockKeys.push('directory-title')
  const duplicateResult = parseAppGenerationPlan(duplicateMember)
  assert.equal(duplicateResult.success, true)

  const mixedOwners = clone(CREW_DIRECTORY_GENERATION_PLAN) as unknown as {
    pages: Array<{ sections: Array<{ blockKeys: string[] }> }>
  }
  mixedOwners.pages[0]!.sections[0]!.blockKeys.push('crew-name')
  const ownerResult = parseAppGenerationPlan(mixedOwners)
  assert.equal(ownerResult.success, true)
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
  assert.equal(proposal.visualWarnings.length, 0)
  assert.ok(proposal.compositionRepairs.length > 0)

  const addMemberButton = proposal.project.pages
    .flatMap((page) => page.blocks)
    .find((block) => block.type === 'button' && block.props.label === 'Add crew member')
  assert.ok(addMemberButton?.layout?.grid)
  if (addMemberButton?.layout?.grid) {
    const grid = addMemberButton.layout.grid
    assert.ok(Math.abs((grid.colStart - 1) - (16 - (grid.colStart + grid.colSpan - 1))) <= 1)
  }

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

test('visual style compiles into ordinary page and block schema properties', () => {
  const plan = clone(CREW_DIRECTORY_GENERATION_PLAN) as AppGenerationPlanV1
  const directoryPlan = plan.pages[0]!
  directoryPlan.visualStyle = {
    pageBackground: '#f8fafc',
    surfaceColor: '#ffffff',
    primaryColor: '#0f766e',
    primaryTextColor: '#ffffff',
    textColor: '#0f172a',
    mutedTextColor: '#475569',
    borderColor: '#94a3b8',
    cornerStyle: 'rounded',
    density: 'compact',
  }

  const compiled = compileGenerationPlan(createBaseProject(), plan, {
    idFactory: sequentialIdFactory(),
  })
  assert.equal(compiled.success, true)
  if (!compiled.success) return

  const directory = compiled.proposal.project.pages.find((page) => page.title === 'Crew Directory')
  assert.ok(directory)
  assert.equal(directory.appearance?.backgroundColor, '#f8fafc')

  const hero = directory.blocks.find((block) => block.props.headline === 'Meet the crew')
  const body = directory.blocks.find((block) => block.props.value === 'Browse profiles or add someone new to the directory.')
  const list = directory.blocks.find((block) => block.type === 'repeater')
  const primaryAction = directory.blocks.find((block) => block.props.label === 'Add crew member')
  assert.ok(hero && body && list && primaryAction)
  assert.equal(hero.props.textColor, '#0f172a')
  assert.equal(hero.props.contentPadding, 8)
  assert.equal(body.props.textColor, '#475569')
  assert.equal(body.props.contentPadding, 2)
  assert.equal(list.props.backgroundColor, '#ffffff')
  assert.equal(list.props.borderColor, '#94a3b8')
  assert.equal(list.props.borderRadius, 18)
  assert.equal(primaryAction.props.backgroundColor, '#0f766e')
  assert.equal(primaryAction.props.textColor, '#ffffff')
})

test('composition repair centers sections, aligns fields, and balances paired actions', () => {
  const plan: AppGenerationPlanV1 = {
    planVersion: 1,
    scope: 'page',
    summary: 'Create an intentionally uneven profile form.',
    collections: [],
    pages: [{
      key: 'profile-form',
      title: 'Profile Form',
      visualStyle: {
        pageBackground: '#f8fafc',
        surfaceColor: '#ffffff',
        primaryColor: '#2563eb',
        primaryTextColor: '#ffffff',
        textColor: '#0f172a',
        mutedTextColor: '#475569',
        borderColor: '#cbd5e1',
        cornerStyle: 'soft',
        density: 'comfortable',
      },
      sections: [
        { key: 'intro', pattern: 'intro', blockKeys: ['title', 'description'] },
        { key: 'fields', pattern: 'form', blockKeys: ['name', 'role'] },
        { key: 'actions', pattern: 'actions', blockKeys: ['save', 'cancel'] },
      ],
      blocks: [
        {
          key: 'title',
          type: 'hero',
          visualRole: 'heading',
          grid: { colStart: 2, rowStart: 2, colSpan: 10, rowSpan: 3 },
          content: { headline: 'Create your profile' },
        },
        {
          key: 'description',
          type: 'text',
          visualRole: 'body',
          grid: { colStart: 4, rowStart: 6, colSpan: 7, rowSpan: 2 },
          content: { value: 'Tell the team who you are.' },
        },
        {
          key: 'name',
          type: 'text',
          visualRole: 'field',
          grid: { colStart: 2, rowStart: 10, colSpan: 8, rowSpan: 3 },
          content: {
            value: '',
            editable: true,
            fieldLabel: 'Name',
            showFieldLabel: true,
            placeholder: 'Jordan Lee',
          },
        },
        {
          key: 'role',
          type: 'text',
          visualRole: 'field',
          grid: { colStart: 5, rowStart: 14, colSpan: 7, rowSpan: 3 },
          content: {
            value: '',
            editable: true,
            fieldLabel: 'Role',
            showFieldLabel: true,
            placeholder: 'Crew lead',
          },
        },
        {
          key: 'save',
          type: 'button',
          visualRole: 'primaryAction',
          grid: { colStart: 2, rowStart: 20, colSpan: 4, rowSpan: 2 },
          content: { label: 'Save' },
        },
        {
          key: 'cancel',
          type: 'button',
          visualRole: 'secondaryAction',
          grid: { colStart: 11, rowStart: 21, colSpan: 3, rowSpan: 2 },
          content: { label: 'Cancel' },
        },
      ],
    }],
  }

  const compiled = compileGenerationPlan(createBaseProject(), plan, {
    idFactory: sequentialIdFactory(),
  })
  assert.equal(compiled.success, true)
  if (!compiled.success) return
  assert.equal(compiled.proposal.visualWarnings.length, 0)
  assert.ok(compiled.proposal.compositionRepairs.length > 0)

  const page = compiled.proposal.project.pages.find((candidate) => candidate.title === 'Profile Form')
  assert.ok(page)
  const title = page.blocks.find((block) => block.props.headline === 'Create your profile')!
  const description = page.blocks.find((block) => block.props.value === 'Tell the team who you are.')!
  const name = page.blocks.find((block) => block.props.fieldLabel === 'Name')!
  const role = page.blocks.find((block) => block.props.fieldLabel === 'Role')!
  const save = page.blocks.find((block) => block.props.label === 'Save')!
  const cancel = page.blocks.find((block) => block.props.label === 'Cancel')!
  assert.equal(title.layout?.grid?.colStart, description.layout?.grid?.colStart)
  assert.equal(title.layout?.grid?.colSpan, description.layout?.grid?.colSpan)
  assert.equal(name.layout?.grid?.rowStart, role.layout?.grid?.rowStart)
  assert.equal(name.layout?.grid?.colSpan, role.layout?.grid?.colSpan)
  assert.notEqual(name.layout?.grid?.colStart, role.layout?.grid?.colStart)
  assert.equal(save.layout?.grid?.rowStart, cancel.layout?.grid?.rowStart)
  assert.equal(save.layout?.grid?.colSpan, cancel.layout?.grid?.colSpan)
})

test('whole-page composition reorganizes blocked sections instead of preserving visual defects', () => {
  const plan: AppGenerationPlanV1 = {
    planVersion: 1,
    scope: 'page',
    summary: 'Create a form whose ideal field alignment is blocked by nearby content.',
    collections: [],
    pages: [{
      key: 'blocked-form-alignment',
      title: 'Blocked Form Alignment',
      sections: [{ key: 'fields', pattern: 'form', blockKeys: ['name', 'role'] }],
      blocks: [
        {
          key: 'name',
          type: 'text',
          visualRole: 'field',
          grid: { colStart: 1, rowStart: 1, colSpan: 6, rowSpan: 3 },
          content: {
            value: '',
            editable: true,
            fieldLabel: 'Name',
            showFieldLabel: true,
            placeholder: 'Name',
          },
        },
        {
          key: 'nearby-copy',
          type: 'text',
          visualRole: 'body',
          grid: { colStart: 8, rowStart: 1, colSpan: 9, rowSpan: 3 },
          content: { value: 'Nearby content that should not be overlapped.' },
        },
        {
          key: 'role',
          type: 'text',
          visualRole: 'field',
          grid: { colStart: 4, rowStart: 5, colSpan: 8, rowSpan: 3 },
          content: {
            value: '',
            editable: true,
            fieldLabel: 'Role',
            showFieldLabel: true,
            placeholder: 'Role',
          },
        },
      ],
    }],
  }

  const compiled = compileGenerationPlan(createBaseProject(), plan, {
    idFactory: sequentialIdFactory(),
  })
  assert.equal(compiled.success, true)
  if (!compiled.success) return
  assert.equal(compiled.proposal.visualWarnings.length, 0)

  const page = compiled.proposal.project.pages.find((candidate) => (
    candidate.title === 'Blocked Form Alignment'
  ))
  assert.ok(page)
  const name = page.blocks.find((block) => block.props.fieldLabel === 'Name')
  const role = page.blocks.find((block) => block.props.fieldLabel === 'Role')
  const nearbyCopy = page.blocks.find((block) => (
    block.props.value === 'Nearby content that should not be overlapped.'
  ))
  assert.ok(name?.layout?.grid && role?.layout?.grid && nearbyCopy?.layout?.grid)
  assert.equal(name.layout.grid.rowStart, role.layout.grid.rowStart)
  assert.equal(name.layout.grid.colSpan, role.layout.grid.colSpan)
  assert.notEqual(name.layout.grid.colStart, role.layout.grid.colStart)
  assert.equal(placementsOverlap(name.layout.grid, nearbyCopy.layout.grid), false)
  assert.equal(placementsOverlap(role.layout.grid, nearbyCopy.layout.grid), false)
})

test('form composition moves an interleaved primary action below every field', () => {
  const plan: AppGenerationPlanV1 = {
    planVersion: 1,
    scope: 'page',
    summary: 'Create a maintenance form with a deliberately misplaced action.',
    collections: [],
    pages: [{
      key: 'maintenance-form',
      title: 'Maintenance Form',
      sections: [{
        key: 'service-form',
        pattern: 'form',
        blockKeys: ['vehicle', 'save', 'service-type', 'notes'],
      }],
      blocks: [
        {
          key: 'vehicle',
          type: 'text',
          visualRole: 'field',
          grid: { colStart: 2, rowStart: 2, colSpan: 12, rowSpan: 3 },
          content: {
            value: '',
            editable: true,
            fieldLabel: 'Vehicle',
            showFieldLabel: true,
            placeholder: 'Vehicle name',
          },
        },
        {
          key: 'save',
          type: 'button',
          visualRole: 'primaryAction',
          grid: { colStart: 5, rowStart: 6, colSpan: 7, rowSpan: 2 },
          content: { label: 'Save service' },
        },
        {
          key: 'service-type',
          type: 'text',
          visualRole: 'field',
          grid: { colStart: 2, rowStart: 9, colSpan: 12, rowSpan: 3 },
          content: {
            value: '',
            editable: true,
            fieldLabel: 'Service type',
            showFieldLabel: true,
            placeholder: 'Oil change',
          },
        },
        {
          key: 'notes',
          type: 'text',
          visualRole: 'field',
          grid: { colStart: 2, rowStart: 13, colSpan: 12, rowSpan: 4 },
          content: {
            value: '',
            editable: true,
            textInputMode: 'multiline',
            fieldLabel: 'Notes',
            showFieldLabel: true,
            placeholder: 'Add service notes',
          },
        },
      ],
    }],
  }

  const compiled = compileGenerationPlan(createBaseProject(), plan, {
    idFactory: sequentialIdFactory(),
  })
  assert.equal(compiled.success, true)
  if (!compiled.success) return

  const page = compiled.proposal.project.pages.find((candidate) => candidate.title === 'Maintenance Form')
  assert.ok(page)
  const fields = page.blocks.filter((block) => block.props.editable === true)
  const action = page.blocks.find((block) => block.props.label === 'Save service')
  assert.ok(action?.layout?.grid)
  const lastFieldRow = Math.max(...fields.map((block) => (
    block.layout!.grid!.rowStart + block.layout!.grid!.rowSpan - 1
  )))
  assert.ok(action.layout.grid.rowStart > lastFieldRow)
  for (let outer = 0; outer < fields.length; outer += 1) {
    for (let inner = outer + 1; inner < fields.length; inner += 1) {
      assert.equal(placementsOverlap(fields[outer].layout!.grid!, fields[inner].layout!.grid!), false)
    }
  }
  assert.equal(compiled.proposal.visualWarnings.some((warning) => (
    warning.code === 'visual-action-before-fields'
    || warning.code === 'visual-inconsistent-fields'
  )), false)
  assert.equal(compiled.proposal.visualWarnings.some((warning) => warning.severity === 'severe'), false)
})

test('repeater composition creates a compact readable item template', () => {
  const plan: AppGenerationPlanV1 = {
    planVersion: 1,
    scope: 'page',
    summary: 'Create a crew directory with a three-value list row.',
    collections: [{
      key: 'crew-members',
      name: 'Crew Members',
      accessPreset: 'public-directory',
      fields: [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'role', label: 'Role', type: 'text' },
        { key: 'status', label: 'Status', type: 'text' },
      ],
    }],
    pages: [{
      key: 'crew-directory',
      title: 'Crew Directory',
      sections: [
        { key: 'directory-list', pattern: 'list', blockKeys: ['crew-list'] },
        {
          key: 'crew-row',
          pattern: 'list',
          blockKeys: ['crew-name', 'crew-role', 'crew-status'],
        },
      ],
      blocks: [
        {
          key: 'crew-list',
          type: 'repeater',
          visualRole: 'list',
          collectionKey: 'crew-members',
          grid: { colStart: 2, rowStart: 2, colSpan: 14, rowSpan: 18 },
          content: {
            itemRowSpan: 12,
            gapRows: 1,
            emptyText: 'No crew members yet',
          },
        },
        {
          key: 'crew-name',
          parentKey: 'crew-list',
          type: 'text',
          visualRole: 'body',
          grid: { colStart: 1, rowStart: 1, colSpan: 4, rowSpan: 1 },
          content: { value: 'Crew member', fontSize: 16, contentPadding: 8 },
          valueBinding: {
            collectionKey: 'crew-members',
            fieldKey: 'name',
            record: 'currentItem',
          },
        },
        {
          key: 'crew-role',
          parentKey: 'crew-list',
          type: 'text',
          visualRole: 'body',
          grid: { colStart: 5, rowStart: 1, colSpan: 4, rowSpan: 1 },
          content: { value: 'Role', fontSize: 14, contentPadding: 8 },
          valueBinding: {
            collectionKey: 'crew-members',
            fieldKey: 'role',
            record: 'currentItem',
          },
        },
        {
          key: 'crew-status',
          parentKey: 'crew-list',
          type: 'text',
          visualRole: 'body',
          grid: { colStart: 9, rowStart: 1, colSpan: 4, rowSpan: 1 },
          content: { value: 'Available', fontSize: 14, contentPadding: 8 },
          valueBinding: {
            collectionKey: 'crew-members',
            fieldKey: 'status',
            record: 'currentItem',
          },
        },
      ],
    }],
  }

  const compiled = compileGenerationPlan(createBaseProject(), plan, {
    idFactory: sequentialIdFactory(),
  })
  assert.equal(compiled.success, true)
  if (!compiled.success) return

  const page = compiled.proposal.project.pages.find((candidate) => candidate.title === 'Crew Directory')
  const repeater = page?.blocks.find((block) => block.type === 'repeater')
  assert.ok(page && repeater?.layout?.grid)
  const children = page.blocks.filter((block) => block.parentId === repeater.id)
  assert.equal(children.length, 3)
  assert.ok(Number(repeater.props.itemRowSpan) < 12)
  assert.ok(repeater.layout.grid.rowSpan <= 7)
  for (const child of children) {
    const grid = child.layout?.grid
    assert.ok(grid)
    assert.ok(grid.colStart + grid.colSpan - 1 <= repeater.layout.grid.colSpan)
    assert.ok(grid.rowStart + grid.rowSpan - 1 <= Number(repeater.props.itemRowSpan))
  }
  for (let outer = 0; outer < children.length; outer += 1) {
    for (let inner = outer + 1; inner < children.length; inner += 1) {
      assert.equal(
        placementsOverlap(children[outer].layout!.grid!, children[inner].layout!.grid!),
        false,
      )
    }
  }
  const first = children[0].layout!.grid!
  assert.ok(first.colSpan >= children[1].layout!.grid!.colSpan)
  assert.equal(compiled.proposal.visualWarnings.some((warning) => warning.severity === 'severe'), false)
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

test('layout compilation expands undersized text-bearing blocks before resolving collisions', () => {
  const plan: AppGenerationPlanV1 = {
    planVersion: 1,
    scope: 'page',
    summary: 'Create a compact operations page.',
    collections: [],
    pages: [{
      key: 'operations',
      title: 'Operations',
      path: '/operations',
      backgroundColor: '#ffffff',
      access: { mode: 'public' },
      blocks: [
        {
          key: 'operations-title',
          type: 'hero',
          grid: { colStart: 2, rowStart: 2, colSpan: 4, rowSpan: 1 },
          content: {
            headline: 'Coordinate field operations without losing track of the details',
            headlineSize: 28,
            contentPadding: 16,
          },
        },
        {
          key: 'operations-description',
          type: 'text',
          grid: { colStart: 2, rowStart: 3, colSpan: 4, rowSpan: 1 },
          content: {
            value: 'Review assignments, update progress, and keep the entire team informed from one place.',
            fontSize: 16,
            contentPadding: 12,
          },
        },
        {
          key: 'open-assignments',
          type: 'button',
          grid: { colStart: 2, rowStart: 4, colSpan: 2, rowSpan: 1 },
          content: { label: 'Open active assignments' },
        },
      ],
    }],
  }

  const compiled = compileGenerationPlan(createBaseProject(), plan, {
    idFactory: sequentialIdFactory(),
  })
  assert.equal(compiled.success, true)
  if (!compiled.success) return

  const page = compiled.proposal.project.pages.find((candidate) => candidate.title === 'Operations')
  assert.ok(page)
  const generated = page.blocks.filter((block) => (
    ['hero', 'text', 'button'].includes(block.type)
  ))
  const hero = generated.find((block) => block.type === 'hero')?.layout?.grid
  const text = generated.find((block) => block.type === 'text')?.layout?.grid
  const button = generated.find((block) => block.type === 'button')?.layout?.grid
  assert.ok(hero && text && button)
  assert.ok(hero.colSpan > 4 || hero.rowSpan > 1)
  assert.ok(text.colSpan > 4 || text.rowSpan > 1)
  assert.ok(button.colSpan > 2 || button.rowSpan > 1)
  assert.ok(compiled.proposal.repairs.some((repair) => (
    repair.reason === 'expanded-to-fit-content'
  )))

  for (let outer = 0; outer < generated.length; outer += 1) {
    for (let inner = outer + 1; inner < generated.length; inner += 1) {
      const first = generated[outer]?.layout?.grid
      const second = generated[inner]?.layout?.grid
      assert.ok(first && second)
      assert.equal(placementsOverlap(first, second), false)
    }
  }
})

test('compilation repairs unreadable generated colors before preview and apply', () => {
  const plan: AppGenerationPlanV1 = {
    planVersion: 1,
    scope: 'page',
    summary: 'Create a dark account page with readable controls.',
    collections: [],
    pages: [{
      key: 'account',
      title: 'Account',
      backgroundColor: '#0f172a',
      blocks: [
        {
          key: 'account-title',
          type: 'hero',
          grid: { colStart: 1, rowStart: 1, colSpan: 16, rowSpan: 3 },
          content: { headline: 'Your account' },
        },
        {
          key: 'account-copy',
          type: 'text',
          grid: { colStart: 1, rowStart: 5, colSpan: 16, rowSpan: 2 },
          content: { value: 'Manage your profile.', textColor: '#0f172a' },
        },
        {
          key: 'account-name',
          type: 'text',
          grid: { colStart: 1, rowStart: 8, colSpan: 16, rowSpan: 3 },
          content: {
            value: '',
            editable: true,
            fieldLabel: 'Name',
            showFieldLabel: true,
            placeholder: 'Enter your name',
            backgroundColor: '#ffffff',
            textColor: '#ffffff',
            placeholderColor: '#ffffff',
            borderColor: '#ffffff',
            borderWidth: 1,
          },
        },
        {
          key: 'save-account',
          type: 'button',
          grid: { colStart: 1, rowStart: 12, colSpan: 8, rowSpan: 2 },
          content: {
            label: 'Save account',
            backgroundColor: '#0f172a',
            textColor: '#0f172a',
          },
        },
      ],
    }],
  }

  const compiled = compileGenerationPlan(createBaseProject(), plan, {
    idFactory: sequentialIdFactory(),
  })
  assert.equal(compiled.success, true)
  if (!compiled.success) return

  const page = compiled.proposal.project.pages.find((candidate) => candidate.title === 'Account')
  assert.ok(page)
  const pageBackground = page.appearance?.backgroundColor ?? '#ffffff'
  const hero = page.blocks.find((block) => block.type === 'hero')
  const copy = page.blocks.find((block) => block.props.value === 'Manage your profile.')
  const input = page.blocks.find((block) => block.props.fieldLabel === 'Name')
  const button = page.blocks.find((block) => block.type === 'button')
  assert.ok(hero && copy && input && button)

  assert.ok(getColorContrastRatio(String(hero.props.textColor), pageBackground) >= 4.5)
  assert.ok(getColorContrastRatio(String(copy.props.textColor), pageBackground) >= 4.5)
  assert.ok(getColorContrastRatio(String(input.props.textColor), String(input.props.backgroundColor)) >= 4.5)
  assert.ok(getColorContrastRatio(String(input.props.placeholderColor), String(input.props.backgroundColor)) >= 3)
  assert.ok(getColorContrastRatio(String(input.props.labelColor), pageBackground) >= 4.5)
  assert.ok(getColorContrastRatio(String(input.props.borderColor), String(input.props.backgroundColor)) >= 1.5)
  assert.ok(getColorContrastRatio(String(button.props.backgroundColor), pageBackground) >= 1.5)
  assert.ok(getColorContrastRatio(String(button.props.textColor), String(button.props.backgroundColor)) >= 4.5)
})

test('layout compilation reflows fragmented sibling placements when nearest-space repair is exhausted', () => {
  const plan: AppGenerationPlanV1 = {
    planVersion: 1,
    scope: 'page',
    summary: 'Create a page whose proposed placements leave fragmented free space.',
    collections: [],
    pages: [{
      key: 'fragmented-layout',
      title: 'Fragmented Layout',
      blocks: [
        {
          key: 'left-panel',
          type: 'text',
          grid: { colStart: 1, rowStart: 1, colSpan: 8, rowSpan: 15 },
          content: { value: 'Left panel', fontSize: 16, contentPadding: 12 },
        },
        {
          key: 'right-panel',
          type: 'text',
          grid: { colStart: 9, rowStart: 15, colSpan: 8, rowSpan: 15 },
          content: { value: 'Right panel', fontSize: 16, contentPadding: 12 },
        },
        {
          key: 'plane-description',
          type: 'text',
          grid: { colStart: 2, rowStart: 2, colSpan: 4, rowSpan: 1 },
          content: {
            value: 'See recent aircraft activity, flight details, and nearby airport information.',
            fontSize: 16,
            contentPadding: 12,
          },
        },
      ],
    }],
  }

  const compiled = compileGenerationPlan(createBaseProject(), plan, {
    idFactory: sequentialIdFactory(),
  })
  assert.equal(compiled.success, true)
  if (!compiled.success) return

  const page = compiled.proposal.project.pages.find((candidate) => candidate.title === 'Fragmented Layout')
  assert.ok(page)
  assert.ok(compiled.proposal.repairs.some((repair) => (
    repair.reason === 'reflowed-to-fit-page'
  )))
  for (let outer = 0; outer < page.blocks.length; outer += 1) {
    for (let inner = outer + 1; inner < page.blocks.length; inner += 1) {
      const first = page.blocks[outer]?.layout?.grid
      const second = page.blocks[inner]?.layout?.grid
      assert.ok(first && second)
      assert.equal(placementsOverlap(first, second), false)
    }
  }
})

test('layout compilation shrinks oversized spans before declaring a page full', () => {
  const plan: AppGenerationPlanV1 = {
    planVersion: 1,
    scope: 'page',
    summary: 'Create an intentionally overfilled page.',
    collections: [],
    pages: [{
      key: 'overfilled',
      title: 'Overfilled',
      blocks: [
        {
          key: 'top-panel',
          type: 'text',
          grid: { colStart: 1, rowStart: 1, colSpan: 16, rowSpan: 15 },
          content: { value: 'Top panel' },
        },
        {
          key: 'bottom-panel',
          type: 'text',
          grid: { colStart: 1, rowStart: 15, colSpan: 16, rowSpan: 15 },
          content: { value: 'Bottom panel' },
        },
      ],
    }],
  }

  const compiled = compileGenerationPlan(createBaseProject(), plan, {
    idFactory: sequentialIdFactory(),
  })
  assert.equal(compiled.success, true)
  if (!compiled.success) return
  const page = compiled.proposal.project.pages.find((candidate) => candidate.title === 'Overfilled')
  assert.ok(page)
  assert.ok(compiled.proposal.repairs.some((repair) => repair.reason === 'reflowed-to-fit-page'))
  const [top, bottom] = page.blocks
  assert.ok(top?.layout?.grid && bottom?.layout?.grid)
  assert.equal(placementsOverlap(top.layout.grid, bottom.layout.grid), false)
  assert.ok(top.layout.grid.rowSpan < 15)
  assert.ok(bottom.layout.grid.rowSpan < 15)
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

test('navigation and access resolve unique existing page aliases without a correction retry', () => {
  const plan: AppGenerationPlanV1 = {
    planVersion: 1,
    scope: 'page',
    summary: 'Create a signed-in account page that can return home.',
    collections: [],
    pages: [{
      key: 'account',
      title: 'Account',
      access: { mode: 'signedIn', redirectPageKey: 'home' },
      blocks: [{
        key: 'return-home',
        type: 'button',
        grid: { colStart: 5, rowStart: 5, colSpan: 8, rowSpan: 2 },
        content: { label: 'Return home' },
        action: { type: 'navigate', targetPageKey: 'home' },
      }],
    }],
  }

  const compiled = compileGenerationPlan(createBaseProject(), plan, {
    idFactory: sequentialIdFactory(),
  })
  assert.equal(compiled.success, true)
  if (!compiled.success) return

  const account = compiled.proposal.project.pages.find((page) => page.title === 'Account')
  const button = account?.blocks.find((block) => block.props.label === 'Return home')
  assert.equal(account?.access?.redirectPageId, 'home-page')
  assert.deepEqual(readAction(button), { type: 'navigate', targetPageId: 'home-page' })
})

test('data references resolve unique collection, field, and input aliases without correction', () => {
  const baseProject = createBaseProject()
  baseProject.dataCollections = [{
    id: 'crew-collection',
    name: 'Crew Members',
    publicRead: true,
    access: { create: 'anyone', read: 'public', update: 'own', delete: 'own' },
    fields: [{ id: 'display-name-field', key: 'display_name', label: 'Name', type: 'text' }],
  }]
  const plan: AppGenerationPlanV1 = {
    planVersion: 1,
    scope: 'page',
    summary: 'Create a crew signup page using existing and generated data.',
    collections: [{
      key: 'contact-records',
      name: 'Contact Records',
      accessPreset: 'private-submissions',
      fields: [{ key: 'email_address', label: 'Email', type: 'email' }],
    }],
    pages: [{
      key: 'crew-signup',
      title: 'Crew Signup',
      blocks: [
        {
          key: 'latest-member',
          type: 'text',
          grid: { colStart: 2, rowStart: 2, colSpan: 14, rowSpan: 2 },
          content: { value: 'Latest member' },
          valueBinding: {
            collectionKey: 'crew-members',
            fieldKey: 'name',
            record: 'latest',
          },
        },
        {
          key: 'email-input',
          type: 'text',
          grid: { colStart: 2, rowStart: 6, colSpan: 14, rowSpan: 3 },
          content: {
            value: '',
            editable: true,
            fieldKey: 'email_address',
            fieldLabel: 'Email',
            showFieldLabel: true,
          },
        },
        {
          key: 'submit-contact',
          type: 'button',
          grid: { colStart: 5, rowStart: 11, colSpan: 8, rowSpan: 2 },
          content: { label: 'Join' },
          action: {
            type: 'submitData',
            collectionKey: 'contact-records',
            fields: [{ fieldBlockKey: 'email-address', targetFieldKey: 'email' }],
          },
        },
      ],
    }],
  }

  const compiled = compileGenerationPlan(baseProject, plan, {
    idFactory: sequentialIdFactory(),
  })
  assert.equal(compiled.success, true)
  if (!compiled.success) return

  const page = compiled.proposal.project.pages.find((candidate) => candidate.title === 'Crew Signup')
  const latestMember = page?.blocks.find((block) => block.props.value === 'Latest member')
  const latestBinding = latestMember?.bindings?.value
  assert.equal(latestBinding?.source, 'collection')
  if (latestBinding?.source === 'collection') {
    assert.equal(latestBinding.collectionId, 'crew-collection')
    assert.equal(latestBinding.fieldId, 'display-name-field')
  }

  const submit = page?.blocks.find((block) => block.props.label === 'Join')
  const action = readAction(submit)
  assert.equal(action?.type, 'submitData')
  if (action?.type === 'submitData') {
    assert.equal(action.fields[0]?.targetFieldKey, 'email_address')
    const input = page?.blocks.find((block) => block.props.fieldKey === 'email_address')
    assert.equal(action.fields[0]?.fieldBlockId, input?.id)
  }
})

test('visual review snapshot describes rendered grids and round-trips without recomposition', () => {
  const plan = clone(CREW_DIRECTORY_GENERATION_PLAN)
  const before = clone(plan)
  const initial = compileGenerationPlan(createBaseProject(), plan)
  assert.equal(initial.success, true)
  if (!initial.success) return
  const snapshot = initial.proposal.visualReviewPlan
  const parsed = parseAppGenerationPlan(snapshot)
  assert.equal(parsed.success, true, JSON.stringify(parsed))
  const reviewed = compileGenerationPlan(createBaseProject(), snapshot, { preservePresentation: true })
  assert.equal(reviewed.success, true, JSON.stringify(reviewed))
  if (!reviewed.success) return
  for (let index = 0; index < snapshot.pages.length; index++) {
    const original = initial.proposal.project.pages[index + 1]
    const result = reviewed.proposal.project.pages[index + 1]
    assert.deepEqual(snapshot.pages[index].blocks.map((block) => block.grid), original.blocks.map((block) => block.layout?.grid))
    assert.deepEqual(result.blocks.map((block) => block.layout?.grid), original.blocks.map((block) => block.layout?.grid))
    assert.deepEqual(result.blocks.map((block) => block.render), original.blocks.map((block) => block.render))
  }
  assert.deepEqual(plan, before)
  assert.deepEqual(reviewed.proposal.repairs, [])
  assert.deepEqual(reviewed.proposal.compositionRepairs, [])
})

test('visual review preserves explicit presentation rather than applying theme overrides', () => {
  const initial = compileGenerationPlan(createBaseProject(), clone(CREW_DIRECTORY_GENERATION_PLAN))
  assert.equal(initial.success, true)
  if (!initial.success) return
  const plan = clone(initial.proposal.visualReviewPlan)
  const button = plan.pages[0].blocks.find((block) => block.type === 'button')!
  button.content = { ...button.content, fontSize: 12, backgroundColor: '#111827', textColor: '#ffffff', borderRadius: 3, buttonPaddingX: 5, buttonPaddingY: 4 }
  button.render = { alignX: 'end', alignY: 'end' }
  const result = compileGenerationPlan(createBaseProject(), plan, { preservePresentation: true })
  assert.equal(result.success, true, JSON.stringify(result))
  if (!result.success) return
  const actual = result.proposal.project.pages[1].blocks.find((block) => block.type === 'button')!
  for (const key of ['fontSize', 'backgroundColor', 'textColor', 'borderRadius', 'buttonPaddingX', 'buttonPaddingY']) {
    assert.equal(actual.props[key], (button.content as Record<string, unknown>)[key])
  }
  assert.deepEqual(actual.layout?.grid, button.grid)
  assert.equal(actual.render?.alignX, 'end')
})

test('visual review rejects invalid placement instead of repairing it', () => {
  const initial = compileGenerationPlan(createBaseProject(), clone(CREW_DIRECTORY_GENERATION_PLAN))
  assert.equal(initial.success, true)
  if (!initial.success) return
  for (const invalid of ['overlap', 'bounds']) {
    const plan = clone(initial.proposal.visualReviewPlan)
    plan.pages[0].blocks[1].grid = invalid === 'overlap'
      ? { ...plan.pages[0].blocks[0].grid }
      : { colStart: 100, rowStart: 100, colSpan: 4, rowSpan: 4 }
    const result = compileGenerationPlan(createBaseProject(), plan, { preservePresentation: true })
    assert.equal(result.success, false, invalid)
  }
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
