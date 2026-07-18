import assert from 'node:assert/strict'
import test from 'node:test'
import { createDemoProject, DEMO_PROJECT_ID } from '../../frontend/src/demo/demoProject.js'
import { CURRENT_SCHEMA_VERSION } from '../../frontend/src/shared/schema/gridMigration.js'
import type { Block, BlockAction, GridPlacement } from '../../frontend/src/shared/schema/types.js'

function placementsOverlap(first: GridPlacement, second: GridPlacement): boolean {
  return (
    first.colStart < second.colStart + second.colSpan &&
    first.colStart + first.colSpan > second.colStart &&
    first.rowStart < second.rowStart + second.rowSpan &&
    first.rowStart + first.rowSpan > second.rowStart
  )
}

function assertBlockFitsGrid(block: Block, maxColumns: number, maxRows: number): void {
  const grid = block.layout?.grid
  assert.ok(grid, `${block.id} must have grid placement`)
  assert.ok(grid.colStart >= 1 && grid.rowStart >= 1, `${block.id} must start inside the grid`)
  assert.ok(grid.colStart + grid.colSpan - 1 <= maxColumns, `${block.id} must fit within ${maxColumns} columns`)
  assert.ok(grid.rowStart + grid.rowSpan - 1 <= maxRows, `${block.id} must fit within ${maxRows} rows`)
}

test('demo project uses the current schema and stays inside the editor grid', () => {
  const project = createDemoProject()

  assert.equal(project.id, DEMO_PROJECT_ID)
  assert.equal(project.schemaVersion, CURRENT_SCHEMA_VERSION)
  assert.deepEqual(project.pages.map((page) => page.title), ['Today', 'Inspection', 'Notes', 'Summary'])

  for (const page of project.pages) {
    assert.ok(page.blocks.length > 0)
    const topLevelBlocks = page.blocks.filter((block) => !block.parentId)

    for (const block of topLevelBlocks) assertBlockFitsGrid(block, 16, 29)

    for (let firstIndex = 0; firstIndex < topLevelBlocks.length; firstIndex += 1) {
      const first = topLevelBlocks[firstIndex]
      const firstGrid = first.layout?.grid
      assert.ok(firstGrid)

      for (let secondIndex = firstIndex + 1; secondIndex < topLevelBlocks.length; secondIndex += 1) {
        const second = topLevelBlocks[secondIndex]
        const secondGrid = second.layout?.grid
        assert.ok(secondGrid)
        assert.equal(
          placementsOverlap(firstGrid, secondGrid),
          false,
          `${first.id} must not overlap ${second.id}`,
        )
      }
    }

    for (const child of page.blocks.filter((block) => block.parentId)) {
      const parent = page.blocks.find((block) => block.id === child.parentId)
      assert.ok(parent, `${child.id} must reference an existing parent`)
      assert.equal(parent.type, 'container', `${child.id} must belong to a container`)
      const parentGrid = parent.layout?.grid
      assert.ok(parentGrid)
      assertBlockFitsGrid(child, parentGrid.colSpan, parentGrid.rowSpan)
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
