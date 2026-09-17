import assert from 'node:assert/strict'
import test from 'node:test'
import { appearanceColor, appearanceNumber, blockSurfaceStyle, blockPadding } from '../../frontend/src/shared/schema/blockAppearance.js'
import { createBlock } from '../../frontend/src/shared/schema/registry.js'
import { migrateProjectToGridLayout } from '../../frontend/src/shared/schema/gridMigration.js'

test('legacy static text stays transparent despite its saved input styles', () => {
  const text = createBlock('text')
  assert.deepEqual(blockSurfaceStyle('text', text.props), {})
  assert.equal(blockSurfaceStyle('hero', {}).backgroundColor, 'transparent')
  assert.equal(blockSurfaceStyle('button', {}).border, '0px solid #cbd5e1')
})

test('surface styles preserve transparent and zero values and scale dimensions', () => {
  const props = { textSurfaceEnabled: true, backgroundColor: 'transparent', borderColor: '#123456', borderWidth: 2, borderRadius: 0, contentPadding: 0 }
  assert.deepEqual(blockSurfaceStyle('text', props, 2), { backgroundColor: 'transparent', border: '4px solid #123456', borderRadius: 0, boxSizing: 'border-box' })
  assert.equal(blockPadding('hero', props, 2), 0)
  assert.equal(blockPadding('hero', {}, 2), 32)
})

test('invalid appearance values use safe fallbacks and numeric bounds', () => {
  assert.equal(appearanceColor('url(example)', 'transparent'), 'transparent')
  assert.equal(appearanceNumber(NaN, 12), 12)
  assert.equal(appearanceNumber(Infinity, 12), 12)
  assert.equal(appearanceNumber(-4, 12), 0)
  assert.equal(appearanceNumber(1000, 0, 12), 12)
})

test('surface properties survive project serialization and migration', () => {
  const props = { textSurfaceEnabled: true, backgroundColor: '#112233', borderWidth: 3, borderRadius: 8, contentPadding: 0 }
  const block = createBlock('text', props)
  const project = migrateProjectToGridLayout(JSON.parse(JSON.stringify({ id: 'appearance', name: 'Appearance', pages: [{ id: 'page', blocks: [block] }] })))
  for (const [key, value] of Object.entries(props)) assert.equal(project.pages[0].blocks[0].props[key], value)
})
