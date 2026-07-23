import assert from 'node:assert/strict'
import test from 'node:test'
import {
  appDataRecordSourceFilter,
  collectAppDataSourceMatches,
  findAppDataSource,
  isPublicReadableCollection,
  isPublicSubmissionSource,
  resolveAppDataWriteSource,
  sanitizeRecordData,
  serializeAppDataRecord,
  serializePublicAppDataRecord,
} from '../src/services/AppDataService.js'
import { normalizeBlockAction } from '../../frontend/src/shared/actions/blockActions.js'
import { migrateProjectToGridLayout } from '../../frontend/src/shared/schema/gridMigration.js'
import { migrateProjectRecord } from '../src/services/ProjectSchemaMigration.js'

const collection = {
  id: 'collection-1',
  name: 'Tasks',
  publicRead: true,
  fields: [{ id: 'field-1', key: 'title', label: 'Title', type: 'text' }],
}

const project = {
  id: 'project-1',
  ownerId: 'owner-1',
  dataCollections: [collection],
  pages: [{
    id: 'page-1',
    title: 'Home',
    blocks: [
      {
        id: 'button-collection',
        type: 'button',
        props: {
          action: {
            type: 'submitData',
            fields: [{ fieldBlockId: 'title-field', targetFieldKey: 'title' }],
            collectionId: collection.id,
          },
        },
      },
      {
        id: 'title-field',
        type: 'text',
        props: { editable: true, fieldKey: 'title', fieldLabel: 'Title' },
      },
    ],
  }],
}

const unifiedButtonProject = {
  id: 'project-2',
  ownerId: 'owner-1',
  pages: [{
    id: 'page-2',
    title: 'Signup',
    blocks: [
      {
        id: 'button-1',
        type: 'button',
        props: {
          label: 'Join',
          dataSourceName: 'Signups',
          action: { type: 'submitData', fields: [{ fieldBlockId: 'email-1' }] },
        },
      },
      {
        id: 'email-1',
        type: 'text',
        props: { editable: true, inputType: 'email', fieldKey: 'email', fieldLabel: 'Email' },
      },
      { id: 'display-copy', type: 'text', props: { value: 'Display only', editable: false } },
      { id: 'static-1', type: 'button', props: { label: 'Decorative button' } },
    ],
  }],
}

test('submit actions preserve collection targets during normalization', () => {
  assert.deepEqual(normalizeBlockAction({
    type: 'submitData',
    fields: [
      { fieldBlockId: ' input-1 ', targetFieldKey: ' title ' },
      { fieldBlockId: 'input-1' },
      { fieldBlockId: '' },
    ],
    collectionId: 'collection-1',
  }), {
    type: 'submitData',
    fields: [{ fieldBlockId: 'input-1', targetFieldKey: 'title' }],
    collectionId: 'collection-1',
  })
})

test('collection-backed buttons write to the stable collection source', () => {
  assert.equal(resolveAppDataWriteSource(project, 'button-collection')?.sourceId, collection.id)
  assert.equal(findAppDataSource(project, collection.id)?.fields[0]?.key, 'title')
})

test('collection sources replace duplicate button sources in listings', () => {
  const sources = collectAppDataSourceMatches(project)
  assert.deepEqual(sources.map((source) => source.sourceId), [collection.id])
  assert.equal(isPublicReadableCollection(project, collection.id), true)
})

test('public submissions require a block-backed source', () => {
  assert.equal(isPublicSubmissionSource(project, 'button-collection'), true)
  assert.equal(isPublicSubmissionSource(project, collection.id), false)
})

test('generated-app auth actions preserve stable field references during normalization', () => {
  assert.deepEqual(normalizeBlockAction({
    type: 'signUpAppUser',
    displayNameFieldBlockId: ' name-field ',
    emailFieldBlockId: ' email-field ',
    passwordFieldBlockId: ' password-field ',
  }), {
    type: 'signUpAppUser',
    displayNameFieldBlockId: 'name-field',
    emailFieldBlockId: 'email-field',
    passwordFieldBlockId: 'password-field',
  })

  assert.deepEqual(normalizeBlockAction({
    type: 'loginAppUser',
    emailFieldBlockId: ' email-field ',
    passwordFieldBlockId: ' password-field ',
  }), {
    type: 'loginAppUser',
    emailFieldBlockId: 'email-field',
    passwordFieldBlockId: 'password-field',
  })
  assert.deepEqual(normalizeBlockAction({ type: 'logoutAppUser' }), { type: 'logoutAppUser' })
})

test('record sanitization omits optional fields that were not submitted', () => {
  const fields = [
    { blockId: 'text-field-1', type: 'text' as const, key: 'field_1', label: 'Field 1', required: false },
    { blockId: 'text-field-2', type: 'text' as const, key: 'field_2', label: 'Field 2', required: false },
    { blockId: 'toggle-1', type: 'toggle' as const, key: 'enabled', label: 'Enabled', required: false },
  ]

  assert.deepEqual(sanitizeRecordData(fields, {
    field_1: '  first value  ',
    field_2: '   ',
    enabled: false,
  }), {
    field_1: 'first value',
    enabled: false,
  })
  assert.deepEqual(sanitizeRecordData(fields, { field_2: 'second value' }), {
    field_2: 'second value',
  })
})

test('record sanitization still rejects missing required fields', () => {
  assert.throws(() => sanitizeRecordData([
    { blockId: 'email-1', type: 'email', key: 'email', label: 'Email', required: true },
  ], {}), /Email is required/)
})

test('canonical app-data records keep compatibility aliases in API responses', () => {
  const createdAt = new Date('2026-07-23T12:00:00.000Z')
  const updatedAt = new Date('2026-07-23T12:05:00.000Z')
  const record = serializeAppDataRecord({
    _id: 'record-1',
    collectionId: 'collection-1',
    ownerAppUserId: 'app-user-1',
    sourceBlockId: 'button-1',
    sourcePageId: 'page-1',
    data: { title: 'First task' },
    createdAt,
    updatedAt,
  })

  assert.equal(record.collectionId, 'collection-1')
  assert.equal(record.ownerAppUserId, 'app-user-1')
  assert.equal(record.sourceBlockId, 'button-1')
  assert.equal(record.sourcePageId, 'page-1')
  assert.equal(record.createdAt, createdAt)
  assert.equal(record.updatedAt, updatedAt)
  assert.equal(record.sourceId, 'collection-1')
  assert.equal(record.formBlockId, 'collection-1')
  assert.equal(record.appUserId, 'app-user-1')
  assert.equal(record.pageId, 'page-1')
  assert.equal(record.submittedAt, createdAt)
})

test('legacy submission documents serialize as canonical app-data records', () => {
  const submittedAt = new Date('2026-07-22T12:00:00.000Z')
  const record = serializeAppDataRecord({
    _id: 'legacy-record',
    appUserId: 'legacy-app-user',
    formBlockId: 'collection-1',
    pageId: 'page-1',
    data: { title: 'Legacy task' },
    submittedAt,
  })

  assert.equal(record.collectionId, 'collection-1')
  assert.equal(record.ownerAppUserId, 'legacy-app-user')
  assert.equal(record.sourcePageId, 'page-1')
  assert.equal(record.createdAt, submittedAt)
  assert.equal(record.updatedAt, submittedAt)
  assert.equal(record.submittedAt, submittedAt)
})

test('record source filters prefer canonical ids and fall back only for legacy documents', () => {
  assert.deepEqual(appDataRecordSourceFilter('collection-1'), {
    $or: [
      { collectionId: 'collection-1' },
      { collectionId: { $exists: false }, formBlockId: 'collection-1' },
    ],
  })
})

test('public collection records omit generated-app ownership metadata', () => {
  const record = serializeAppDataRecord({
    _id: 'record-1',
    collectionId: 'collection-1',
    ownerAppUserId: 'app-user-1',
    data: { title: 'Public task' },
    createdAt: new Date('2026-07-23T12:00:00.000Z'),
  })
  const publicRecord = serializePublicAppDataRecord(record)

  assert.equal('ownerAppUserId' in publicRecord, false)
  assert.equal('appUserId' in publicRecord, false)
  assert.equal(publicRecord.data.title, 'Public task')
})

test('unified submit buttons are app-data sources while static buttons are not', () => {
  const sources = collectAppDataSourceMatches(unifiedButtonProject)
  assert.deepEqual(sources.map((source) => source.sourceId), ['button-1'])
  assert.equal(sources[0]?.type, 'button')
  assert.equal(sources[0]?.name, 'Signups')
  assert.equal(sources[0]?.fields[0]?.key, 'email')
  assert.equal(sources[0]?.fields.length, 1)
  assert.equal(findAppDataSource(unifiedButtonProject, 'static-1'), null)
})

test('project migration converts retired buttons and text fields to the unified schema', () => {
  const migrated = migrateProjectToGridLayout({
    schemaVersion: 3,
    id: 'legacy-project',
    name: 'Legacy project',
    pages: [{
      id: 'page-1',
      blocks: [
        { id: 'old-nav', type: 'navButton', props: { label: 'Next', toPageId: 'page-2' } },
        { id: 'old-submit', type: 'submitButton', props: { label: 'Save', submitGroupId: 'profile' } },
        { id: 'profile-name', type: 'input', props: { label: 'Name', submitGroupId: 'profile' } },
        { id: 'profile-bio', type: 'textarea', props: { label: 'Bio', submitGroupId: 'profile' } },
      ],
    }],
  } as any)

  assert.deepEqual(migrated.pages[0].blocks.map((block) => block.type), ['button', 'button', 'text', 'text'])
  assert.deepEqual(migrated.pages[0].blocks[0].props.action, { type: 'navigate', targetPageId: 'page-2' })
  assert.deepEqual(migrated.pages[0].blocks[1].props.action, {
    type: 'submitData',
    fields: [{ fieldBlockId: 'profile-name' }, { fieldBlockId: 'profile-bio' }],
  })
  assert.equal(migrated.pages[0].blocks[2].props.submitGroupId, undefined)
  assert.equal(migrated.pages[0].blocks[2].props.editable, true)
  assert.equal(migrated.pages[0].blocks[2].props.textInputMode, 'singleLine')
  assert.equal(migrated.pages[0].blocks[3].props.textInputMode, 'multiline')
})

test('backend project migration exposes only unified button records', () => {
  const migrated = migrateProjectRecord({
    id: 'legacy-project',
    ownerId: 'owner-1',
    name: 'Legacy project',
    schemaVersion: 3,
    pages: [{
      id: 'page-1',
      blocks: [
        { id: 'old-submit', type: 'submitButton', props: { submitGroupId: 'profile' } },
        { id: 'profile-name', type: 'input', props: { label: 'Name', submitGroupId: 'profile' } },
      ],
    }],
  })

  assert.equal(migrated.schemaVersion, 6)
  assert.equal(migrated.pages?.[0].blocks?.[0].type, 'button')
  assert.deepEqual(migrated.pages?.[0].blocks?.[0].props.action, {
    type: 'submitData',
    fields: [{ fieldBlockId: 'profile-name' }],
  })
  assert.equal(migrated.pages?.[0].blocks?.[1].type, 'text')
  assert.equal(migrated.pages?.[0].blocks?.[1].props.editable, true)
  assert.equal(migrated.pages?.[0].blocks?.[1].props.submitGroupId, undefined)
})
