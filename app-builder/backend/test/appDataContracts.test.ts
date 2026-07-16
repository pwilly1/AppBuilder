import assert from 'node:assert/strict'
import test from 'node:test'
import {
  collectAppDataSourceMatches,
  findAppDataSource,
  isPublicReadableCollection,
  isPublicSubmissionSource,
  resolveAppDataWriteSource,
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
            fields: [{ fieldBlockId: 'input-1', targetFieldKey: 'title' }],
            collectionId: collection.id,
          },
        },
      },
      { id: 'input-1', type: 'input', props: { fieldKey: 'title', label: 'Title' } },
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
      { id: 'email-1', type: 'input', props: { fieldKey: 'email', label: 'Email' } },
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

test('unified submit buttons are app-data sources while static buttons are not', () => {
  const sources = collectAppDataSourceMatches(unifiedButtonProject)
  assert.deepEqual(sources.map((source) => source.sourceId), ['button-1'])
  assert.equal(sources[0]?.type, 'button')
  assert.equal(sources[0]?.name, 'Signups')
  assert.equal(sources[0]?.fields[0]?.key, 'email')
  assert.equal(findAppDataSource(unifiedButtonProject, 'static-1'), null)
})

test('project migration converts retired button records to the unified schema', () => {
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
      ],
    }],
  } as any)

  assert.deepEqual(migrated.pages[0].blocks.map((block) => block.type), ['button', 'button', 'input'])
  assert.deepEqual(migrated.pages[0].blocks[0].props.action, { type: 'navigate', targetPageId: 'page-2' })
  assert.deepEqual(migrated.pages[0].blocks[1].props.action, {
    type: 'submitData',
    fields: [{ fieldBlockId: 'profile-name' }],
  })
  assert.equal(migrated.pages[0].blocks[2].props.submitGroupId, undefined)
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

  assert.equal(migrated.schemaVersion, 5)
  assert.equal(migrated.pages?.[0].blocks?.[0].type, 'button')
  assert.deepEqual(migrated.pages?.[0].blocks?.[0].props.action, {
    type: 'submitData',
    fields: [{ fieldBlockId: 'profile-name' }],
  })
  assert.equal(migrated.pages?.[0].blocks?.[1].props.submitGroupId, undefined)
})
