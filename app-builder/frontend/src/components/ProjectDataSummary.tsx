import { CircleStackIcon } from '@heroicons/react/24/outline'
import type { AppDataCollection } from '../shared/schema/types'

type Props = {
  collections: AppDataCollection[]
  disabled?: boolean
  onOpen: () => void
}

export default function ProjectDataSummary({ collections, disabled = false, onOpen }: Props) {
  return (
    <section className="editor-rail-surface overflow-hidden">
      <header className="border-b border-slate-200/70 px-3.5 py-3.5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <CircleStackIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="editor-section-title">Project Data</div>
            <h3 className="mt-1 text-sm font-semibold text-slate-900">Collections</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Manage reusable fields, access rules, and stored app records in the full Data workspace.
            </p>
          </div>
        </div>
      </header>

      <div className="p-3.5">
        {collections.length > 0 ? (
          <div className="grid gap-2">
            {collections.slice(0, 3).map((collection) => (
              <div key={collection.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <span className="min-w-0 truncate text-xs font-semibold text-slate-800">{collection.name}</span>
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                  {collection.fields.length} {collection.fields.length === 1 ? 'field' : 'fields'}
                </span>
              </div>
            ))}
            {collections.length > 3 ? (
              <p className="px-1 text-[11px] text-slate-500">+{collections.length - 3} more collections</p>
            ) : null}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white/55 px-3 py-4 text-center text-xs leading-5 text-slate-500">
            This project does not have any collections yet.
          </p>
        )}

        <button type="button" className="btn-sm mt-3 w-full justify-center" onClick={onOpen} disabled={disabled}>
          Open Data workspace
        </button>
        {disabled ? (
          <p className="mt-2 text-center text-[11px] leading-4 text-slate-500">
            Save the project and sign in to manage hosted data.
          </p>
        ) : null}
      </div>
    </section>
  )
}
