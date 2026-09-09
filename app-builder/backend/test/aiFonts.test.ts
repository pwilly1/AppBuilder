import assert from 'node:assert/strict'
import test from 'node:test'
import { AI_GENERATION_FONT_FAMILIES, parseAppGenerationPlan, type AppGenerationPlanV1 } from '@apptura/shared/ai'
import { BLOCK_FONTS } from '../../frontend/src/shared/schema/fonts.js'
import { compileGenerationPlan } from '../../frontend/src/ai/compileGenerationPlan.js'
import { preserveVisualReviewContract } from '../src/ai/AiVisualReviewContract.js'
import { preserveCorrectionContract } from '../src/ai/AiCorrectionContract.js'
import { CURRENT_SCHEMA_VERSION } from '../../frontend/src/shared/schema/gridMigration.js'

function plan(): AppGenerationPlanV1 {
  return { planVersion: 1, scope: 'page', summary: 'Font test', collections: [], pages: [{
    key: 'fonts', title: 'Fonts', blocks: [
      { key: 'heading', type: 'hero', grid: { colStart: 2, rowStart: 2, colSpan: 14, rowSpan: 4 }, content: { headline: 'Hello', fontFamily: 'lusitana' } },
      { key: 'body', type: 'text', grid: { colStart: 2, rowStart: 8, colSpan: 14, rowSpan: 4 }, content: { value: 'World', fontFamily: 'lato' } },
      { key: 'action', type: 'button', grid: { colStart: 2, rowStart: 15, colSpan: 14, rowSpan: 4 }, content: { label: 'Continue', fontFamily: 'spaceMono' } },
    ],
  }] }
}

test('AI font catalog matches editor and parser rejects unsupported families', () => {
  assert.deepEqual([...AI_GENERATION_FONT_FAMILIES], BLOCK_FONTS.map((font) => font.id))
  assert.equal(parseAppGenerationPlan(plan()).success, true)
  for (const index of [0, 1, 2]) {
    const invalid = plan()
    Object.assign(invalid.pages[0].blocks[index].content!, { fontFamily: 'Arial' })
    const parsed = parseAppGenerationPlan(invalid)
    assert.equal(parsed.success, false)
  }
})

test('fonts survive compilation, rendered snapshot, and presentation-preserving recompilation', () => {
  const base = { id: 'base', name: 'Base', schemaVersion: CURRENT_SCHEMA_VERSION, pages: [] }
  const initial = compileGenerationPlan(base, plan())
  assert.equal(initial.success, true)
  if (!initial.success) return
  assert.deepEqual(initial.proposal.project.pages[0].blocks.map((block) => block.props.fontFamily), ['lusitana', 'lato', 'spaceMono'])
  const snapshot = initial.proposal.visualReviewPlan
  assert.equal(parseAppGenerationPlan(snapshot).success, true)
  const reviewed = compileGenerationPlan(base, snapshot, { preservePresentation: true })
  assert.equal(reviewed.success, true)
  if (reviewed.success) assert.deepEqual(reviewed.proposal.project.pages[0].blocks.map((block) => block.props.fontFamily), ['lusitana', 'lato', 'spaceMono'])
})

test('visual review may change fonts, but layout corrections preserve the chosen family', () => {
  const previous = plan()
  const candidate = plan()
  for (const block of candidate.pages[0].blocks) Object.assign(block.content!, { fontFamily: 'lato' })
  const review = preserveVisualReviewContract(previous, candidate)
  assert.deepEqual(review.pages[0].blocks.map((block) => block.content && 'fontFamily' in block.content ? block.content.fontFamily : undefined), ['lato', 'lato', 'lato'])
  const correction = preserveCorrectionContract(previous, candidate, [])
  assert.deepEqual(correction.pages[0].blocks.map((block) => block.content && 'fontFamily' in block.content ? block.content.fontFamily : undefined), ['lusitana', 'lato', 'spaceMono'])
})
