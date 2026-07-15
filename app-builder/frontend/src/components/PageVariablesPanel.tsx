import type { PageStateVariable } from '../shared/schema/types'

type Props = {
  variables: PageStateVariable[]
  onChange: (variables: PageStateVariable[]) => void
}

export default function PageVariablesPanel({ variables, onChange }: Props) {
  function addVariable() {
    onChange([
      ...variables,
      {
        id: crypto.randomUUID(),
        name: `Text value ${variables.length + 1}`,
        type: 'text',
        initialValue: '',
      },
    ])
  }

  function updateVariable(id: string, updates: Partial<PageStateVariable>) {
    onChange(variables.map((variable) => variable.id === id ? { ...variable, ...updates } : variable))
  }

  return (
    <section className="editor-rail-surface overflow-hidden">
      <header className="border-b border-slate-200/70 px-3.5 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="editor-section-title">Page Data</div>
            <h3 className="mt-1 text-sm font-semibold text-slate-900">Text variables</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">Define page values that Text and Hero blocks can display.</p>
          </div>
          <button type="button" className="btn-sm shrink-0" onClick={addVariable}>New</button>
        </div>
      </header>

      {variables.length === 0 ? (
        <div className="px-3.5 py-4 text-center">
          <p className="text-xs leading-5 text-slate-500">Add a variable, then select it from a Text or Hero block's inspector.</p>
        </div>
      ) : (
        <div className="grid gap-2.5 p-3">
          {variables.map((variable, index) => (
            <div key={variable.id} className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500" htmlFor={`page-variable-name-${variable.id}`}>
                    Variable {index + 1}
                  </label>
                  <input
                    key={`${variable.id}-${variable.name}`}
                    id={`page-variable-name-${variable.id}`}
                    className="inspector-input mt-1"
                    defaultValue={variable.name}
                    onBlur={(event) => updateVariable(variable.id, { name: event.target.value.trim() || `Text value ${index + 1}` })}
                    aria-label={`Variable ${index + 1} name`}
                  />
                </div>
                <button
                  type="button"
                  className="mt-5 rounded-lg px-2 py-2 text-xs font-semibold text-slate-400 hover:bg-red-50 hover:text-red-600"
                  onClick={() => onChange(variables.filter((candidate) => candidate.id !== variable.id))}
                  aria-label={`Remove ${variable.name || `variable ${index + 1}`}`}
                >
                  Remove
                </button>
              </div>
              <label className="mt-2 grid gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                Initial / preview value
                <input
                  key={`${variable.id}-${variable.initialValue}`}
                  className="inspector-input"
                  defaultValue={variable.initialValue}
                  onBlur={(event) => updateVariable(variable.id, { initialValue: event.target.value })}
                  placeholder="Text shown when the page opens"
                />
              </label>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
