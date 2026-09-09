import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { BLOCK_FONTS, blockFontCss, normalizeBlockFont, supportsBlockFont } from '../../frontend/src/shared/schema/fonts.js'
import { createBlock } from '../../frontend/src/shared/schema/registry.js'
import { findFontPlacement } from '../../frontend/src/editor/fontPlacement.js'
import type { Block } from '../../frontend/src/shared/schema/types.js'

const block = (id: string, colStart = 1, rowStart = 1): Block => ({
  ...createBlock('text'), id,
  layout: { grid: { colStart, rowStart, colSpan: 3, rowSpan: 2 } },
})

test('font IDs are allowlisted and missing or invalid values keep the default', () => {
  for (const value of [undefined, null, '', 'https://example.com/font.ttf', 'not-a-font']) {
    assert.equal(normalizeBlockFont(value), 'default')
    assert.equal(blockFontCss(value), blockFontCss('default'))
  }
  for (const font of BLOCK_FONTS) {
    assert.equal(normalizeBlockFont(font.id), font.id)
    assert.equal(createBlock('text', { fontFamily: font.id }).props.fontFamily, font.id)
  }
  assert.equal(createBlock('hero').props.fontFamily, 'default')
  assert.equal(createBlock('hero', { fontFamily: 'invalid' }).props.fontFamily, 'default')
  assert.equal(supportsBlockFont('image'), false)
  assert.equal(supportsBlockFont('button'), true)
})

test('web and Android ship byte-identical font files and licenses', () => {
  for (const [family, native] of [['Lato', 'lato'], ['Lusitana', 'lusitana'], ['SpaceMono', 'spacemono']]) {
    for (const weight of ['Regular', 'Bold']) {
      const web = readFileSync(new URL(`../../frontend/public/fonts/${family}-${weight}.ttf`, import.meta.url))
      const android = readFileSync(new URL(`../../native-preview/Android/app/src/main/res/font/${native}_${weight.toLowerCase()}.ttf`, import.meta.url))
      assert.deepEqual(web, android)
      assert.equal(web.readUInt32BE(0), 0x00010000)
    }
    assert.deepEqual(
      readFileSync(new URL(`../../frontend/public/fonts/${family}-OFL.txt`, import.meta.url)),
      readFileSync(new URL(`../../native-preview/Android/app/src/main/assets/font-licenses/${family}-OFL.txt`, import.meta.url)),
    )
  }
})

test('font fit keeps a fitting box unchanged and grows only as necessary', () => {
  const target = block('target')
  assert.deepEqual(findFontPlacement(target, [], { cols: 16, rows: 29 }, () => true), target.layout!.grid)
  assert.deepEqual(findFontPlacement(target, [], { cols: 16, rows: 29 }, (g) => g.colSpan >= 5), {
    colStart: 1, rowStart: 1, colSpan: 5, rowSpan: 2,
  })
  assert.equal(target.layout!.grid!.colSpan, 3)
})

test('font growth stops at siblings and owner bounds', () => {
  const target = block('target')
  assert.equal(findFontPlacement(target, [block('neighbor', 4)], { cols: 8, rows: 4 }, (g) => g.colSpan > 3), null)
  assert.equal(findFontPlacement(target, [], { cols: 3, rows: 2 }, () => false), null)
  target.parentId = 'container'
  assert.ok(findFontPlacement(target, [block('outside', 4)], { cols: 8, rows: 4 }, (g) => g.colSpan > 3))
  const child = { ...block('child', 4), parentId: 'container' }
  assert.equal(findFontPlacement(target, [child], { cols: 8, rows: 4 }, (g) => g.colSpan > 3), null)
})
