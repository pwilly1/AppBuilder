import assert from 'node:assert/strict'
import test from 'node:test'
import {
  collectAppDataSourceMatches,
  findAppDataSource,
  isPublicReadableCollection,
  isPublicSubmissionSource,
  resolveAppDataWriteSource,
} from '../src/services/AppDataService.js'
import { normalizeBlockAction, resolveBlockAction } from '../../frontend/src/shared/actions/blockActions.js'

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
        id: 'submit-1',
        type: 'submitButton',
        props: {
          submitGroupId: 'tasks',
          action: { type: 'submitData', submitGroupId: 'tasks', collectionId: collection.id },
        },
      },
      { id: 'input-1', type: 'input', props: { submitGroupId: 'tasks', fieldKey: 'title', label: 'Title' } },
    ],
  }],
}

test('submit actions preserve collection targets during normalization', () => {
  assert.deepEqual(normalizeBlockAction({ type: 'submitData', submitGroupId: 'tasks', collectionId: 'collection-1' }), {
    type: 'submitData',
    submitGroupId: 'tasks',
    collectionId: 'collection-1',
  })
})

test('legacy submit buttons still resolve without a collection', () => {
  assert.deepEqual(resolveBlockAction({ id: 'legacy', type: 'submitButton', props: { submitGroupId: 'default' } }), {
    type: 'submitData',
    submitGroupId: 'default',
  })
})

test('collection-backed submit buttons write to the stable collection source', () => {
  assert.equal(resolveAppDataWriteSource(project, 'submit-1')?.sourceId, collection.id)
  assert.equal(findAppDataSource(project, collection.id)?.fields[0]?.key, 'title')
})

test('collection sources replace duplicate submit-button sources in listings', () => {
  const sources = collectAppDataSourceMatches(project)
  assert.deepEqual(sources.map((source) => source.sourceId), [collection.id])
  assert.equal(isPublicReadableCollection(project, collection.id), true)
})

test('public submissions require a block-backed source', () => {
  assert.equal(isPublicSubmissionSource(project, 'submit-1'), true)
  assert.equal(isPublicSubmissionSource(project, collection.id), false)
})
