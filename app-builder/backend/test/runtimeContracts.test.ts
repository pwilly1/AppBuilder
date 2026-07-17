import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createPageRuntimeContext,
  hasPageStateBinding,
  normalizeRuntimeValueRef,
  resolveActionRuntimeValue,
  resolveBlockProps,
  resolveRuntimeValue,
} from '../../frontend/src/shared/runtime/runtimeBindings.js'
import {
  isActionConfigured,
  isSupportedExternalUrl,
  normalizeBlockAction,
  resolveBlockAction,
} from '../../frontend/src/shared/actions/blockActions.js'
import type { Block, Page } from '../../frontend/src/shared/schema/types.js'
import { normalizePageBackgroundColor } from '../../frontend/src/shared/schema/pageAppearance.js'

test('page background colors normalize to portable six-digit hex values', () => {
  assert.equal(normalizePageBackgroundColor('#EFF6FF'), '#eff6ff')
  assert.equal(normalizePageBackgroundColor('  #fffbf5  '), '#fffbf5')
  assert.equal(normalizePageBackgroundColor('red'), '#ffffff')
  assert.equal(normalizePageBackgroundColor(null), '#ffffff')
})

test('page runtime context initializes valid text variables', () => {
  const page = {
    stateVariables: [
      { id: 'name', name: 'Name', type: 'text', initialValue: 'Guest' },
      { id: '', name: 'Invalid', type: 'text', initialValue: 'Ignored' },
      { id: 'count', name: 'Count', type: 'number', initialValue: 3 },
    ],
  } as unknown as Pick<Page, 'stateVariables'>

  assert.deepEqual(createPageRuntimeContext(page), { pageState: { name: 'Guest' } })
})

test('runtime references normalize supported sources and reject malformed values', () => {
  assert.deepEqual(normalizeRuntimeValueRef({ source: 'static', value: 'Hello' }), {
    source: 'static',
    value: 'Hello',
  })
  assert.deepEqual(normalizeRuntimeValueRef({ source: 'pageState', variableId: ' title ', fallback: 'Fallback' }), {
    source: 'pageState',
    variableId: ' title ',
    fallback: 'Fallback',
  })
  assert.deepEqual(normalizeRuntimeValueRef({ source: 'formValue', fieldBlockId: 'input-1' }), {
    source: 'formValue',
    fieldBlockId: 'input-1',
  })
  assert.equal(normalizeRuntimeValueRef({ source: 'pageState', variableId: '' }), null)
  assert.equal(normalizeRuntimeValueRef({ source: 'futureSource', id: 'value-1' }), null)
  assert.equal(normalizeRuntimeValueRef(null), null)
})

test('runtime values use live page state and safe fallbacks', () => {
  const context = { pageState: { greeting: 'Welcome back' } }

  assert.equal(resolveRuntimeValue({ source: 'pageState', variableId: 'greeting' }, context, 'Hello'), 'Welcome back')
  assert.equal(
    resolveRuntimeValue({ source: 'pageState', variableId: 'missing', fallback: 'Configured fallback' }, context, 'Static'),
    'Configured fallback',
  )
  assert.equal(resolveRuntimeValue({ source: 'pageState', variableId: 'missing' }, context, 'Static'), 'Static')
  assert.equal(resolveRuntimeValue({ source: 'static', value: 'Fixed' }, context, 'Static'), 'Fixed')
  assert.equal(resolveRuntimeValue({ source: 'unknown' }, context, 'Static'), 'Static')
})

test('action values resolve live form fields without changing display binding behavior', () => {
  const reference = { source: 'formValue', fieldBlockId: 'input-1', fallback: 'Fallback' } as const
  const context = { pageState: {} }

  assert.equal(resolveRuntimeValue(reference, context, 'Static'), 'Fallback')
  assert.equal(resolveActionRuntimeValue(reference, context, (id) => id === 'input-1' ? 'Typed value' : undefined), 'Typed value')
  assert.equal(resolveActionRuntimeValue(reference, context), 'Fallback')
})

test('block prop resolution is property-specific and does not mutate saved props', () => {
  const block: Block = {
    id: 'text-1',
    type: 'text',
    props: { value: 'Static title', fontSize: 18 },
    bindings: {
      value: { source: 'pageState', variableId: 'title', fallback: 'Fallback title' },
    },
  }

  const resolved = resolveBlockProps(block, { pageState: { title: 'Runtime title' } })

  assert.deepEqual(resolved, { value: 'Runtime title', fontSize: 18 })
  assert.deepEqual(block.props, { value: 'Static title', fontSize: 18 })
  assert.equal(hasPageStateBinding(block, 'value'), true)
  assert.equal(hasPageStateBinding(block, 'fontSize'), false)
})

test('block actions normalize each supported action contract', () => {
  assert.deepEqual(normalizeBlockAction({ type: 'navigate', targetPageId: ' page-2 ' }), {
    type: 'navigate',
    targetPageId: 'page-2',
  })
  assert.deepEqual(normalizeBlockAction({
    type: 'submitData',
    fields: [{ fieldBlockId: ' input-1 ', targetFieldKey: ' email ' }],
    collectionId: ' records ',
  }), {
    type: 'submitData',
    fields: [{ fieldBlockId: 'input-1', targetFieldKey: 'email' }],
    collectionId: 'records',
  })
  assert.deepEqual(normalizeBlockAction({ type: 'openUrl', url: ' https://example.com ' }), {
    type: 'openUrl',
    url: 'https://example.com',
  })
  assert.deepEqual(normalizeBlockAction({
    type: 'setPageState',
    variableId: ' status ',
    value: { source: 'formValue', fieldBlockId: 'input-1' },
  }), {
    type: 'setPageState',
    variableId: 'status',
    value: { source: 'formValue', fieldBlockId: 'input-1' },
  })
  assert.equal(normalizeBlockAction({ type: 'unsupported' }), null)
})

test('configured action checks reject incomplete and unsafe actions', () => {
  assert.equal(isActionConfigured({ type: 'navigate', targetPageId: '' }), false)
  assert.equal(isActionConfigured({ type: 'navigate', targetPageId: 'page-2' }), true)
  assert.equal(isActionConfigured({ type: 'submitData', fields: [] }), false)
  assert.equal(isActionConfigured({ type: 'submitData', fields: [{ fieldBlockId: 'input-1' }] }), true)
  assert.equal(isActionConfigured({
    type: 'submitData',
    fields: [{ fieldBlockId: 'input-1' }],
    collectionId: 'records',
  }), false)
  assert.equal(isActionConfigured({
    type: 'submitData',
    fields: [{ fieldBlockId: 'input-1', targetFieldKey: 'email' }],
    collectionId: 'records',
  }), true)
  assert.equal(isActionConfigured({ type: 'openUrl', url: 'javascript:alert(1)' }), false)
  assert.equal(isActionConfigured({ type: 'openUrl', url: 'https://example.com' }), true)
  assert.equal(isSupportedExternalUrl('http://localhost:5173'), true)
  assert.equal(isSupportedExternalUrl('mailto:test@example.com'), false)
  assert.equal(isSupportedExternalUrl('not a url'), false)
})

test('actions are read only from the unified props action field', () => {
  const block: Block = {
    id: 'button-1',
    type: 'button',
    props: { action: { type: 'navigate', targetPageId: 'page-2' } },
  }

  assert.deepEqual(resolveBlockAction(block), { type: 'navigate', targetPageId: 'page-2' })
  assert.equal(resolveBlockAction({ ...block, props: { toPageId: 'legacy-page' } }), null)
})
