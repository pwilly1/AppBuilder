import { useEffect, useState } from 'react'
import type { AppDataCollection, AppDataCollectionField, AppDataFieldType } from '../shared/schema/types'

type Props = {
  collections: AppDataCollection[]
  onChange: (collections: AppDataCollection[]) => void
}

const FIELD_TYPES: Array<{ value: AppDataFieldType; label: string }> = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Yes / No' },
  { value: 'email', label: 'Email' },
  { value: 'date', label: 'Date' },
]

export default function DataCollectionsPanel({ collections, onChange }: Props) {
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(collections[0]?.id ?? null)
  const selectedCollection = collections.find((collection) => collection.id === selectedCollectionId) ?? null

  useEffect(() => {
    if (selectedCollection || collections.length === 0) return
    setSelectedCollectionId(collections[0]?.id ?? null)
  }, [collections, selectedCollection])

  function updateCollection(id: string, updates: Partial<AppDataCollection>) {
    onChange(collections.map((collection) => collection.id === id ? { ...collection, ...updates } : collection))
  }

  function updateField(collection: AppDataCollection, fieldId: string, updates: Partial<AppDataCollectionField>) {
    updateCollection(collection.id, {
      fields: collection.fields.map((field) => field.id === fieldId ? { ...field, ...updates } : field),
    })
  }

  function addCollection() {
    const collection = createCollection(collections.length + 1)
    onChange([...collections, collection])
    setSelectedCollectionId(collection.id)
  }

  function deleteSelectedCollection() {
    if (!selectedCollection) return
    if (!window.confirm(`Delete ${selectedCollection.name}? Blocks using it will need a new collection.`)) return
    const remaining = collections.filter((collection) => collection.id !== selectedCollection.id)
    onChange(remaining)
    setSelectedCollectionId(remaining[0]?.id ?? null)
  }

  return (
    <section className="editor-rail-surface overflow-hidden" data-testid="data-collections-panel">
      <header className="border-b border-slate-200/70 px-3.5 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="editor-section-title">App Data</div>
            <h3 className="mt-1 text-sm font-semibold text-slate-900">Collections</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">Store records that forms create and app blocks can display.</p>
          </div>
          <button type="button" className="btn-sm shrink-0" onClick={addCollection}>New</button>
        </div>
      </header>

      {collections.length === 0 ? (
        <div className="px-3.5 py-5 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-lg font-bold text-blue-700">+</div>
          <h4 className="mt-3 text-sm font-semibold text-slate-900">No collections yet</h4>
          <p className="mt-1 text-xs leading-5 text-slate-500">Create one when your app needs to save and display reusable records.</p>
          <button type="button" className="btn-sm mt-3" onClick={addCollection}>Create collection</button>
        </div>
      ) : (
        <>
          <div className="border-b border-slate-200/70 bg-slate-50/55 p-2.5">
            <label className="grid gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Editing collection
              <select
                className="inspector-input bg-white"
                value={selectedCollection?.id ?? ''}
                onChange={(event) => setSelectedCollectionId(event.target.value)}
              >
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>{collection.name}</option>
                ))}
              </select>
            </label>
          </div>

          {selectedCollection ? (
            <div className="grid gap-4 p-3" data-testid="collection-editor">
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <StepNumber>1</StepNumber>
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Name the collection</div>
                    <div className="text-[11px] text-slate-500">Use a plural name such as Tasks or Customers.</div>
                  </div>
                </div>
                <input
                  key={selectedCollection.id}
                  className="inspector-input"
                  aria-label="Collection name"
                  defaultValue={selectedCollection.name}
                  onBlur={(event) => updateCollection(selectedCollection.id, { name: event.target.value.trim() || 'Collection' })}
                />
              </div>

              <div className="grid gap-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <StepNumber>2</StepNumber>
                    <div>
                      <div className="text-xs font-semibold text-slate-900">Define the fields</div>
                      <div className="text-[11px] text-slate-500">Each field stores one piece of a record.</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ghost-btn shrink-0 !px-2.5 !py-1.5 text-[11px]"
                    onClick={() => updateCollection(selectedCollection.id, {
                      fields: [...selectedCollection.fields, createField(nextFieldIndex(selectedCollection.fields))],
                    })}
                  >
                    Add field
                  </button>
                </div>

                {selectedCollection.fields.length ? (
                  <div className="grid gap-2">
                    {selectedCollection.fields.map((field, index) => (
                      <div key={field.id} className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500" htmlFor={`field-label-${field.id}`}>
                              Field {index + 1}
                            </label>
                            <input
                              id={`field-label-${field.id}`}
                              className="inspector-input mt-1"
                              defaultValue={field.label}
                              onBlur={(event) => updateField(selectedCollection, field.id, { label: event.target.value.trim() || 'Field' })}
                            />
                          </div>
                          <button
                            type="button"
                            className="mt-5 rounded-lg px-2 py-2 text-xs font-semibold text-slate-400 hover:bg-red-50 hover:text-red-600"
                            aria-label={`Remove ${field.label}`}
                            title="Remove field"
                            onClick={() => updateCollection(selectedCollection.id, {
                              fields: selectedCollection.fields.filter((candidate) => candidate.id !== field.id),
                            })}
                          >
                            Remove
                          </button>
                        </div>
                        <div className="mt-2 grid grid-cols-[1fr_auto] items-end gap-2">
                          <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                            Type
                            <select
                              className="inspector-input"
                              value={field.type}
                              onChange={(event) => updateField(selectedCollection, field.id, { type: event.target.value as AppDataFieldType })}
                            >
                              {FIELD_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                            </select>
                          </label>
                          <label className="flex h-[42px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-[11px] font-semibold text-slate-600">
                            <input
                              type="checkbox"
                              className="inspector-toggle"
                              checked={Boolean(field.required)}
                              onChange={(event) => updateField(selectedCollection, field.id, { required: event.target.checked })}
                            />
                            Required
                          </label>
                        </div>
                        <div className="mt-2 truncate text-[10px] text-slate-400" title={field.key}>Saved as: <code>{field.key}</code></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
                    Add at least one field before submitting records.
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <StepNumber>3</StepNumber>
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Choose app access</div>
                    <div className="text-[11px] text-slate-500">Control whether runtime blocks can show these records.</div>
                  </div>
                </div>
                <label className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 ${selectedCollection.publicRead ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                  <input
                    type="checkbox"
                    className="inspector-toggle mt-0.5"
                    checked={selectedCollection.publicRead}
                    onChange={(event) => updateCollection(selectedCollection.id, { publicRead: event.target.checked })}
                  />
                  <span className="text-xs leading-5 text-slate-600">
                    <strong className="block text-slate-900">Show records inside the app</strong>
                    Turn this on when Text or Hero blocks should read this collection. Leave it off for private submission-only data.
                  </span>
                </label>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <button type="button" className="text-xs font-semibold text-red-600 hover:text-red-700" onClick={deleteSelectedCollection}>
                  Delete this collection
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}

function StepNumber({ children }: { children: string }) {
  return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">{children}</span>
}

function createCollection(index: number): AppDataCollection {
  return {
    id: crypto.randomUUID(),
    name: `Collection ${index}`,
    publicRead: false,
    fields: [createField(1)],
  }
}

function createField(index: number): AppDataCollectionField {
  return {
    id: crypto.randomUUID(),
    key: `field_${index}`,
    label: `Field ${index}`,
    type: 'text',
    required: false,
  }
}

function nextFieldIndex(fields: AppDataCollectionField[]) {
  const used = new Set(fields.map((field) => field.key))
  let index = fields.length + 1
  while (used.has(`field_${index}`)) index += 1
  return index
}
