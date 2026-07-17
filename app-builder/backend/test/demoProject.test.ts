import assert from 'node:assert/strict'
import test from 'node:test'
import { createDemoProject, DEMO_PROJECT_ID } from '../../frontend/src/demo/demoProject.js'
import { CURRENT_SCHEMA_VERSION } from '../../frontend/src/shared/schema/gridMigration.js'
import type { BlockAction } from '../../frontend/src/shared/schema/types.js'

test('demo project uses the current schema and stays inside the editor grid', () => {
  const project = createDemoProject()

  assert.equal(project.id, DEMO_PROJECT_ID)
  assert.equal(project.schemaVersion, CURRENT_SCHEMA_VERSION)
  assert.equal(project.pages.length, 2)

  for (const page of project.pages) {
    assert.ok(page.blocks.length > 0)
    for (const block of page.blocks) {
      const grid = block.layout?.grid
      assert.ok(grid, `${block.id} must have grid placement`)
      assert.ok(grid.colStart >= 1 && grid.rowStart >= 1, `${block.id} must start inside the grid`)
      assert.ok(grid.colStart + grid.colSpan - 1 <= 16, `${block.id} must fit within 16 columns`)
      assert.ok(grid.rowStart + grid.rowSpan - 1 <= 29, `${block.id} must fit within 29 rows`)
    }
  }
})

test('demo actions and bindings only reference IDs that exist in the demo schema', () => {
  const project = createDemoProject()
  const pageIds = new Set(project.pages.map((page) => page.id))

  for (const page of project.pages) {
    const blockIds = new Set(page.blocks.map((block) => block.id))
    const variableIds = new Set((page.stateVariables || []).map((variable) => variable.id))

    for (const block of page.blocks) {
      const action = block.props.action as BlockAction | undefined
      if (action?.type === 'navigate') assert.ok(pageIds.has(action.targetPageId))
      if (action?.type === 'setPageState') {
        assert.ok(variableIds.has(action.variableId))
        if (action.value.source === 'formValue') assert.ok(blockIds.has(action.value.fieldBlockId))
      }

      for (const binding of Object.values(block.bindings || {})) {
        if (binding.source === 'pageState') assert.ok(variableIds.has(binding.variableId))
        if (binding.source === 'formValue') assert.ok(blockIds.has(binding.fieldBlockId))
      }
    }
  }
})
