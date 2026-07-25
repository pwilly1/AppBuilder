import assert from 'node:assert/strict'
import test from 'node:test'
import {
  collectBoundCollectionRequests,
  createPageRuntimeContext,
  getCollectionDataKey,
  hasDynamicBinding,
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
import {
  isPageAccessible,
  normalizePageAccess,
  resolvePageAccess,
} from '../../frontend/src/shared/runtime/pageAccess.js'
import { validateBehaviorDraft } from '../../frontend/src/components/behaviorBuilderUtils.js'

test('page background colors normalize to portable six-digit hex values', () => {
  assert.equal(normalizePageBackgroundColor('#EFF6FF'), '#eff6ff')
  assert.equal(normalizePageBackgroundColor('  #fffbf5  '), '#fffbf5')
  assert.equal(normalizePageBackgroundColor('red'), '#ffffff')
  assert.equal(normalizePageBackgroundColor(null), '#ffffff')
})

test('page access defaults to public and respects app-user session state', () => {
  const publicPage = { id: 'public', access: { mode: 'public' as const } }
  const signedInPage = { id: 'private', access: { mode: 'signedIn' as const } }
  const signedOutPage = { id: 'login', access: { mode: 'signedOut' as const } }

  assert.deepEqual(normalizePageAccess(undefined), { mode: 'public' })
  assert.deepEqual(normalizePageAccess({
    mode: 'signedIn',
    redirectPageId: ' login ',
  }), {
    mode: 'signedIn',
    redirectPageId: 'login',
  })
  assert.equal(isPageAccessible(publicPage, false), true)
  assert.equal(isPageAccessible(publicPage, true), true)
  assert.equal(isPageAccessible(signedInPage, false), false)
  assert.equal(isPageAccessible(signedInPage, true), true)
  assert.equal(isPageAccessible(signedOutPage, false), true)
  assert.equal(isPageAccessible(signedOutPage, true), false)
})

test('page access follows configured redirects and falls back safely', () => {
  const pages = [
    { id: 'home', access: { mode: 'signedIn' as const, redirectPageId: 'login' } },
    { id: 'login', access: { mode: 'signedOut' as const, redirectPageId: 'home' } },
  ]

  assert.deepEqual(resolvePageAccess(pages, 'home', false), {
    pageId: 'login',
    redirected: true,
    unavailable: false,
  })
  assert.deepEqual(resolvePageAccess(pages, 'login', true), {
    pageId: 'home',
    redirected: true,
    unavailable: false,
  })
})

test('page access handles redirect cycles and no-access projects', () => {
  const cycle = [
    { id: 'private-a', access: { mode: 'signedIn' as const, redirectPageId: 'private-b' } },
    { id: 'private-b', access: { mode: 'signedIn' as const, redirectPageId: 'private-a' } },
    { id: 'login', access: { mode: 'signedOut' as const } },
  ]
  assert.deepEqual(resolvePageAccess(cycle, 'private-a', false), {
    pageId: 'login',
    redirected: true,
    unavailable: false,
  })

  const unavailable = cycle.slice(0, 2)
  assert.deepEqual(resolvePageAccess(unavailable, 'private-a', false), {
    pageId: null,
    redirected: false,
    unavailable: true,
  })
})

test('page runtime context initializes valid text variables', () => {
  const page = {
    stateVariables: [
      { id: 'name', name: 'Name', type: 'text', initialValue: 'Guest' },
      { id: '', name: 'Invalid', type: 'text', initialValue: 'Ignored' },
      { id: 'count', name: 'Count', type: 'number', initialValue: 3 },
    ],
  } as unknown as Pick<Page, 'stateVariables'>

  assert.deepEqual(createPageRuntimeContext(page), { pageState: { name: 'Guest' }, collectionData: {} })
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
  assert.deepEqual(normalizeRuntimeValueRef({ source: 'collection', collectionId: 'tasks', fieldId: 'title' }), {
    source: 'collection',
    collectionId: 'tasks',
    fieldId: 'title',
    record: { mode: 'latest' },
  })
  assert.deepEqual(normalizeRuntimeValueRef({
    source: 'collection',
    collectionId: 'tasks',
    fieldId: 'title',
    record: { mode: 'currentUser' },
  }), {
    source: 'collection',
    collectionId: 'tasks',
    fieldId: 'title',
    record: { mode: 'currentUser' },
  })
  assert.deepEqual(normalizeRuntimeValueRef({
    source: 'collection',
    collectionId: 'tasks',
    fieldId: 'title',
    record: { mode: 'specific', recordId: ' record-1 ' },
  }), {
    source: 'collection',
    collectionId: 'tasks',
    fieldId: 'title',
    record: { mode: 'specific', recordId: 'record-1' },
  })
  assert.equal(normalizeRuntimeValueRef({ source: 'pageState', variableId: '' }), null)
  assert.equal(normalizeRuntimeValueRef({ source: 'collection', collectionId: 'tasks', fieldId: '' }), null)
  assert.equal(normalizeRuntimeValueRef({
    source: 'collection',
    collectionId: 'tasks',
    fieldId: 'title',
    record: { mode: 'specific', recordId: '' },
  }), null)
  assert.equal(normalizeRuntimeValueRef({ source: 'futureSource', id: 'value-1' }), null)
  assert.equal(normalizeRuntimeValueRef(null), null)
})

test('runtime values use live page state and safe fallbacks', () => {
  const context = { pageState: { greeting: 'Welcome back' }, collectionData: {} }

  assert.equal(resolveRuntimeValue({ source: 'pageState', variableId: 'greeting' }, context, 'Hello'), 'Welcome back')
  assert.equal(
    resolveRuntimeValue({ source: 'pageState', variableId: 'missing', fallback: 'Configured fallback' }, context, 'Static'),
    'Configured fallback',
  )
  assert.equal(resolveRuntimeValue({ source: 'pageState', variableId: 'missing' }, context, 'Static'), 'Static')
  assert.equal(resolveRuntimeValue({ source: 'static', value: 'Fixed' }, context, 'Static'), 'Fixed')
  assert.equal(resolveRuntimeValue({ source: 'unknown' }, context, 'Static'), 'Static')
})

test('collection bindings resolve stable field ids and fall back until ready', () => {
  const reference = { source: 'collection', collectionId: 'tasks', fieldId: 'field-title' } as const
  const latestKey = getCollectionDataKey('tasks')

  assert.equal(resolveRuntimeValue(reference, {
    pageState: {},
    collectionData: { [latestKey]: { status: 'loading' } },
  }, 'Static title'), 'Static title')
  assert.equal(resolveRuntimeValue(reference, {
    pageState: {},
    collectionData: {
      [latestKey]: {
        status: 'ready',
        recordId: 'record-1',
        values: { 'field-title': 'Inspect generator' },
      },
    },
  }, 'Static title'), 'Inspect generator')

  const specificReference = {
    ...reference,
    record: { mode: 'specific', recordId: 'record-2' },
  } as const
  assert.equal(resolveRuntimeValue(specificReference, {
    pageState: {},
    collectionData: {
      [getCollectionDataKey('tasks', specificReference.record)]: {
        status: 'ready',
        recordId: 'record-2',
        values: { 'field-title': 'Specific task' },
      },
    },
  }, 'Static title'), 'Specific task')
})

test('action values resolve live form fields without changing display binding behavior', () => {
  const reference = { source: 'formValue', fieldBlockId: 'input-1', fallback: 'Fallback' } as const
  const context = { pageState: {}, collectionData: {} }

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

  const resolved = resolveBlockProps(block, { pageState: { title: 'Runtime title' }, collectionData: {} })

  assert.deepEqual(resolved, { value: 'Runtime title', fontSize: 18 })
  assert.deepEqual(block.props, { value: 'Static title', fontSize: 18 })
  assert.equal(hasPageStateBinding(block, 'value'), true)
  assert.equal(hasDynamicBinding(block, 'value'), true)
  assert.equal(hasPageStateBinding(block, 'fontSize'), false)
})

test('collection prop resolution does not mutate saved block content', () => {
  const block: Block = {
    id: 'hero-1',
    type: 'hero',
    props: { headline: 'Static headline', headlineSize: 36 },
    bindings: {
      headline: { source: 'collection', collectionId: 'tasks', fieldId: 'field-title' },
    },
  }

  const resolved = resolveBlockProps(block, {
    pageState: {},
    collectionData: {
      [getCollectionDataKey('tasks')]: {
        status: 'ready',
        recordId: 'record-1',
        values: { 'field-title': 'Runtime headline' },
      },
    },
  })

  assert.deepEqual(resolved, { headline: 'Runtime headline', headlineSize: 36 })
  assert.deepEqual(block.props, { headline: 'Static headline', headlineSize: 36 })
  assert.equal(hasDynamicBinding(block, 'headline'), true)
})

test('page runtime deduplicates identical selectors and separates record scopes', () => {
  const page: Pick<Page, 'blocks'> = {
    blocks: [
      {
        id: 'text-1',
        type: 'text',
        props: { value: 'Fallback' },
        bindings: { value: { source: 'collection', collectionId: 'tasks', fieldId: 'field-title' } },
      },
      {
        id: 'hero-1',
        type: 'hero',
        props: { headline: 'Fallback' },
        bindings: { headline: { source: 'collection', collectionId: 'tasks', fieldId: 'field-status' } },
      },
      {
        id: 'text-2',
        type: 'text',
        props: { value: 'Fallback' },
        bindings: {
          value: {
            source: 'collection',
            collectionId: 'tasks',
            fieldId: 'field-title',
            record: { mode: 'specific', recordId: 'record-1' },
          },
        },
      },
      {
        id: 'text-3',
        type: 'text',
        props: { value: 'Fallback' },
        bindings: {
          value: {
            source: 'collection',
            collectionId: 'tasks',
            fieldId: 'field-title',
            record: { mode: 'specific', recordId: 'record-2' },
          },
        },
      },
      {
        id: 'text-4',
        type: 'text',
        props: { value: 'Fallback' },
        bindings: {
          value: {
            source: 'collection',
            collectionId: 'tasks',
            fieldId: 'field-title',
            record: { mode: 'currentUser' },
          },
        },
      },
      {
        id: 'hero-2',
        type: 'hero',
        props: { headline: 'Fallback' },
        bindings: {
          headline: {
            source: 'collection',
            collectionId: 'tasks',
            fieldId: 'field-status',
            record: { mode: 'currentUser' },
          },
        },
      },
    ],
  }

  assert.equal(getCollectionDataKey('tasks', { mode: 'currentUser' }), 'tasks::currentUser')
  assert.deepEqual(collectBoundCollectionRequests(page), [
    { key: 'tasks::latest', collectionId: 'tasks', record: { mode: 'latest' } },
    { key: 'tasks::specific:record-1', collectionId: 'tasks', record: { mode: 'specific', recordId: 'record-1' } },
    { key: 'tasks::specific:record-2', collectionId: 'tasks', record: { mode: 'specific', recordId: 'record-2' } },
    { key: 'tasks::currentUser', collectionId: 'tasks', record: { mode: 'currentUser' } },
  ])
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
  assert.deepEqual(normalizeBlockAction({
    type: 'updateCurrentUserRecord',
    collectionId: ' profiles ',
    fields: [{ fieldBlockId: ' name-input ', targetFieldKey: ' displayName ' }],
  }), {
    type: 'updateCurrentUserRecord',
    collectionId: 'profiles',
    fields: [{ fieldBlockId: 'name-input', targetFieldKey: 'displayName' }],
  })
  assert.deepEqual(normalizeBlockAction({
    type: 'deleteCurrentUserRecord',
    collectionId: ' profiles ',
  }), {
    type: 'deleteCurrentUserRecord',
    collectionId: 'profiles',
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
  assert.equal(isActionConfigured({
    type: 'updateCurrentUserRecord',
    collectionId: 'profiles',
    fields: [{ fieldBlockId: 'name-input' }],
  }), false)
  assert.equal(isActionConfigured({
    type: 'updateCurrentUserRecord',
    collectionId: 'profiles',
    fields: [{ fieldBlockId: 'name-input', targetFieldKey: 'displayName' }],
  }), true)
  assert.equal(isActionConfigured({ type: 'deleteCurrentUserRecord', collectionId: '' }), false)
  assert.equal(isActionConfigured({ type: 'deleteCurrentUserRecord', collectionId: 'profiles' }), true)
  assert.equal(isActionConfigured({ type: 'openUrl', url: 'javascript:alert(1)' }), false)
  assert.equal(isActionConfigured({ type: 'openUrl', url: 'https://example.com' }), true)
  assert.equal(isSupportedExternalUrl('http://localhost:5173'), true)
  assert.equal(isSupportedExternalUrl('mailto:test@example.com'), false)
  assert.equal(isSupportedExternalUrl('not a url'), false)
})

test('record mutation behaviors require compatible fields and owner-scoped collection policies', () => {
  const button: Block = {
    id: 'update-button',
    type: 'button',
    props: {},
  }
  const nameInput: Block = {
    id: 'name-input',
    type: 'text',
    props: { editable: true, fieldLabel: 'Display name' },
  }
  const collection = {
    id: 'profiles',
    name: 'Profiles',
    publicRead: false,
    access: {
      create: 'authenticated' as const,
      read: 'own' as const,
      update: 'own' as const,
      delete: 'own' as const,
    },
    fields: [
      { id: 'display-name', key: 'displayName', label: 'Display name', type: 'text' as const },
    ],
  }
  const context = {
    block: button,
    pages: [],
    pageBlocks: [nameInput, button],
    pageStateVariables: [],
    dataCollections: [collection],
    allowDataActions: true,
  }

  assert.equal(validateBehaviorDraft({
    type: 'updateCurrentUserRecord',
    collectionId: 'profiles',
    fields: [{ fieldBlockId: 'name-input', targetFieldKey: 'displayName' }],
  }, context), null)
  assert.equal(validateBehaviorDraft({
    type: 'deleteCurrentUserRecord',
    collectionId: 'profiles',
  }, context), null)
  assert.equal(validateBehaviorDraft({
    type: 'updateCurrentUserRecord',
    collectionId: 'profiles',
    fields: [{ fieldBlockId: 'name-input' }],
  }, context), 'Choose a collection field for every selected input.')

  assert.equal(validateBehaviorDraft({
    type: 'deleteCurrentUserRecord',
    collectionId: 'profiles',
  }, {
    ...context,
    dataCollections: [{
      ...collection,
      access: { ...collection.access, delete: 'none' as const },
    }],
  }), 'Enable own-record deletes for this collection in the Data workspace.')
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
