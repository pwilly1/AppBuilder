import assert from 'node:assert/strict'
import test from 'node:test'
import { blockTypographyStyle, normalizeTypography, defaultLineHeight, defaultTextWeight } from '../../frontend/src/shared/schema/fonts.js'
import { createBlock } from '../../frontend/src/shared/schema/registry.js'
import { migrateProjectToGridLayout } from '../../frontend/src/shared/schema/gridMigration.js'

test('unset typography preserves existing block defaults', () => {
  assert.deepEqual(blockTypographyStyle({}), {})
  assert.equal(defaultTextWeight('hero'), 700)
  assert.equal(defaultTextWeight('text'), 400)
  assert.equal(defaultLineHeight('hero'), 1.15)
  assert.equal(defaultLineHeight('text'), 1.45)
})

test('typography validates enums and bounds numeric styles', () => {
  assert.deepEqual(normalizeTypography({ fontWeight: 900, fontStyle: 'oblique', textAlign: 'justify', textDecoration: 'blink', lineHeight: NaN, letterSpacing: Infinity }), {})
  assert.deepEqual(normalizeTypography({ lineHeight: 0, letterSpacing: -100 }), { lineHeight: 1, letterSpacing: -2 })
  assert.deepEqual(normalizeTypography({ lineHeight: 20, letterSpacing: 100 }), { lineHeight: 3, letterSpacing: 10 })
})

test('typography supports normal overrides and scales spacing without changing line-height ratio', () => {
  const props = { fontWeight: 400, fontStyle: 'italic', textAlign: 'right', textDecoration: 'underline', lineHeight: 1.8, letterSpacing: 2 }
  assert.deepEqual(blockTypographyStyle(props, 1.5), { ...props, letterSpacing: 3 })
  assert.equal(props.letterSpacing, 2)
  assert.deepEqual(normalizeTypography({ fontWeight: 400, fontStyle: 'normal', textDecoration: 'none' }), { fontWeight: 400, fontStyle: 'normal', textDecoration: 'none' })
})

test('text styles survive registry creation and project serialization/migration', () => {
  const typography = { fontWeight: 400, fontStyle: 'italic', textAlign: 'center', textDecoration: 'underline', lineHeight: 1.7, letterSpacing: 1.5 }
  const block = createBlock('hero', typography)
  const project = migrateProjectToGridLayout(JSON.parse(JSON.stringify({ id: 'typography', name: 'Typography', pages: [{ id: 'page', blocks: [block] }] })))
  assert.deepEqual(normalizeTypography(project.pages[0].blocks[0].props), typography)
})
