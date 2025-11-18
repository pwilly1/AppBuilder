import React from 'react'
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
    <header className="max-w-6xl mx-auto px-4 mb-6 flex items-center justify-between">
      <button
        type="button"
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => navigate('/')}
        aria-label="Go to landing"
      >
        <div className="h-8 w-8 rounded-md bg-primary" />
        <h1 className="text-xl font-semibold">AppBuilder</h1>
      </button>

      <div className="flex items-center gap-3">
        {window.location.pathname === '/editor' ? (
          <>
            <button className="text-sm muted" onClick={undo} disabled={!canUndo}>
              Undo
            </button>
            <button className="text-sm muted" onClick={redo} disabled={!canRedo}>
              Redo
            </button>
            <button className="text-sm muted" onClick={() => navigate('/dashboard')}>
              ← Dashboard
            </button>
            <button className="btn" onClick={saveProject}>
              Save
            </button>
            <div className="text-sm muted ml-2">
              {isSaving ? 'Saving…' : lastSavedAt ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}` : null}
              {saveError ? ` • ${saveError}` : null}
            </div>
          </>
        ) : null}

        {authed ? (
          <>
            <button className="text-sm muted" onClick={() => navigate('/account')}>
              You
            </button>
            <button
              className="text-sm muted"
              onClick={() => {
                logout()
                navigate('/')
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <button className="text-sm muted" onClick={() => navigate('/')}>
            Account
          </button>
        )}
      </div>
    </header>
  )
}
