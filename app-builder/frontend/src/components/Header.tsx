// © 2025 Preston Willis. All rights reserved.
import { useNavigate } from 'react-router-dom'

type Props = {
  authed: boolean
  setAuthed: (v: boolean) => void
  logout: () => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  saveProject: () => void
  isSaving?: boolean
  lastSavedAt?: number | null
  saveError?: string | null
}

export default function Header(props: Props) {
  const navigate = useNavigate()
  const { authed, logout, undo, redo, canUndo, canRedo, saveProject, isSaving, lastSavedAt, saveError } = props

  return (
    <header className="sticky top-0 z-40 mx-auto mb-4 w-full max-w-[var(--max-width)] px-4 pt-4">
      <div className="shell-panel flex items-center justify-between rounded-[1.75rem] px-5 py-4">
        <button
          type="button"
          className="flex cursor-pointer items-center gap-3"
          onClick={() => navigate('/')}
          aria-label="Go to landing"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563eb] via-[#1d4ed8] to-[#172554] text-sm font-bold text-white shadow-lg">
            A
          </div>
          <div className="text-left">
            <h1 className="section-heading text-2xl font-semibold text-slate-900" title="Apptura">Apptura</h1>
            <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Native App Builder</div>
          </div>
        </button>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {window.location.pathname === '/editor' ? (
            <>
              <button className="ghost-btn !px-3 !py-2 text-sm disabled:opacity-50" onClick={undo} disabled={!canUndo}>
                Undo
              </button>
              <button className="ghost-btn !px-3 !py-2 text-sm disabled:opacity-50" onClick={redo} disabled={!canRedo}>
                Redo
              </button>
              <button className="ghost-btn !px-3 !py-2 text-sm" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </button>
              <button className="btn" onClick={saveProject}>
                Save
              </button>
              <div className="min-w-[150px] text-right text-xs text-slate-500">
                {isSaving ? 'Saving...' : lastSavedAt ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}` : 'Not saved yet'}
                {saveError ? ` | ${saveError}` : null}
              </div>
            </>
          ) : null}

          {authed ? (
            <>
              <button className="ghost-btn !px-3 !py-2 text-sm" onClick={() => navigate('/account')}>
                Account
              </button>
              <button
                className="ghost-btn !px-3 !py-2 text-sm"
                onClick={() => {
                  logout()
                  navigate('/')
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <button className="ghost-btn !px-3 !py-2 text-sm" onClick={() => navigate('/')}>
              Account
            </button>
          )}
        </div>
      </div>
    </header>
  )
}


