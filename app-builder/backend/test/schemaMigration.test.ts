import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CURRENT_SCHEMA_VERSION,
  migratePageToGridLayout,
  migrateProjectToGridLayout,
} from '../../frontend/src/shared/schema/gridMigration.js'
import type { Project } from '../../frontend/src/shared/schema/types.js'

test('version-one projects scale placements from eight to sixteen columns', () => {
  const migrated = migrateProjectToGridLayout({
    schemaVersion: 1,
    id: 'project-1',
    name: 'Legacy density',
    pages: [{
      id: 'page-1',
      blocks: [{
        id: 'text-1',
        type: 'text',
        props: { value: 'Hello' },
        layout: { grid: { colStart: 2, rowStart: 2, colSpan: 3, rowSpan: 2 } },
      }],
    }],
  })

  assert.equal(migrated.schemaVersion, CURRENT_SCHEMA_VERSION)
  assert.deepEqual(migrated.pages[0].blocks[0].layout?.grid, {
    colStart: 3,
    rowStart: 3,
    colSpan: 6,
    rowSpan: 4,
  })
})

test('migration assigns deterministic placements to blocks without grid data', () => {
  const migrated = migratePageToGridLayout({
    id: 'page-1',
    blocks: [
      { id: 'text-1', type: 'text', props: {}, editorPlacement: { x: 0, y: 0 } },
      { id: 'button-1', type: 'button', props: {}, editorPlacement: { x: 0, y: 100 } },
    ],
  })

  assert.deepEqual(migrated.blocks[0].layout?.grid, { colStart: 1, rowStart: 1, colSpan: 8, rowSpan: 4 })
  assert.deepEqual(migrated.blocks[1].layout?.grid, { colStart: 9, rowStart: 1, colSpan: 5, rowSpan: 2 })
})

test('migration drops unsupported block records instead of crashing renderers', () => {
  const project = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: 'project-1',
    name: 'Unsupported block',
    pages: [{
      id: 'page-1',
      blocks: [
        { id: 'text-1', type: 'text', props: { value: 'Keep me' } },
        { id: 'unknown-1', type: 'retiredBlock', props: {} },
      ],
    }],
  } as unknown as Project

  const migrated = migrateProjectToGridLayout(project)

  assert.deepEqual(migrated.pages[0].blocks.map((block) => block.id), ['text-1'])
})

test('migration applies renderer alignment defaults without overwriting saved metadata', () => {
  const migrated = migratePageToGridLayout({
    id: 'page-1',
    blocks: [{
      id: 'text-1',
      type: 'text',
      props: {},
      layout: { grid: { colStart: 1, rowStart: 1, colSpan: 4, rowSpan: 2 } },
      render: { alignX: 'start', widthPx: 90 },
    }],
  })

  assert.deepEqual(migrated.blocks[0].render, {
    alignX: 'start',
    alignY: 'center',
    widthPx: 90,
  })
})
