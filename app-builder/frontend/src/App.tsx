// import { Preview } from './editor/Preview' (not used)
import { useMemo, useState, useEffect, useRef } from 'react'
import type { Project, Page, Block } from './shared/BlockTypes'

import { PageRenderer } from './PageRenderer'
import { AddBlock } from './AddBlock'

import Inspector from './components/Inspector'
import Landing from './components/Landing'
import Account from './pages/Account'
import Dashboard from './pages/Dashboard'

import { getProject, updateProject, createProject, getToken, listProjects } from './api'
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom'

const initialProject: Project = {
  id: 'proj1',
  name: 'My App',
  pages: [
    {
      id: 'home',
      title: 'Home',
      path: '/home',
      blocks: [
        {
          id: 'b1',
          type: 'hero',
          props: { headline: 'Welcome to My App', subhead: 'Edit me' },
        },
        { id: 'b2', type: 'text', props: { value: 'This is a text block.' } },
      ],
    },
    { id: 'contact', title: 'Contact', path: '/contact', blocks: [] },
  ],
}

export default function App() {
  const [authed, setAuthed] = useState<boolean>(() => !!getToken())

  const [project, setProject] = useState<Project>(initialProject)
  const [history, setHistory] = useState<Project[]>(() => [JSON.parse(JSON.stringify(initialProject))])
  const [historyIndex, setHistoryIndex] = useState<number>(0)
  const [selectedPageId, setSelectedPageId] = useState<string>(() => project.pages?.[0]?.id ?? '')
  const [selectedBlock, setSelectedBlock] = useState<any | null>(null)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const autosaveTimer = useRef<number | null>(null)
  const isFirstMount = useRef<boolean>(true)

  const page = useMemo(() => project.pages.find((p) => p.id === selectedPageId), [project, selectedPageId])

  // page rename / add helpers intentionally removed (not used in current UI)

  const addBlock = (b: Block) => {
    applyChange((p) => ({
      ...p,
      pages: p.pages.map((pg) => (pg.id === selectedPageId ? { ...pg, blocks: [...pg.blocks, b] } : pg)),
    }))
  }

  async function openProject(proj: any, navigate?: (path: string) => void) {
    // proj may be a summary (no pages) or a full project; fetch if necessary
    let full = proj

    if (!full.pages) {
      full = await getProject(proj.id)
    }

    // ensure the project has at least one page so the editor has something to render
    if (!full.pages || full.pages.length === 0) {
      const id = crypto.randomUUID()
      full.pages = [{ id, title: 'Home', path: '/home', blocks: [] }]
    }

    // replace current project and reset undo history
    setProject(full)
    setSelectedPageId(full.pages[0].id)
    const snapshot = JSON.parse(JSON.stringify(full))
    setHistory([snapshot])
    setHistoryIndex(0)

    if (navigate) navigate('/editor')
  }

  function editBlock(updated: Block) {
    applyChange((p) => ({
      ...p,
      pages: p.pages.map((pg) => (pg.id === selectedPageId ? { ...pg, blocks: pg.blocks.map((b) => (b.id === updated.id ? updated : b)) } : pg)),
    }))
  }

  function deleteBlock(id: string) {
    applyChange((p) => ({
      ...p,
      pages: p.pages.map((pg) => (pg.id === selectedPageId ? { ...pg, blocks: pg.blocks.filter((b) => b.id !== id) } : pg)),
    }))
  }

  async function saveProject() {
    setIsSaving(true)
    setSaveError(null)
    try {
      const isObjectIdLike = typeof project.id === 'string' && /^[0-9a-fA-F]{24}$/.test(project.id)

      if (!isObjectIdLike) {
        const created: any = await createProject(project)
        setProject(created)
        setLastSavedAt(Date.now())
        alert('Project created')
        return
      }

      await updateProject(project.id, project)
      setLastSavedAt(Date.now())
      alert('Project saved')
    } catch (err: any) {
      if (err?.status === 403) {
        try {
          localStorage.removeItem('app_token')
        } catch {
          /* ignore */
        }

        setAuthed(false)
        alert('Guests cannot save projects. Please sign up or log in to save.')
        return
      }

      setSaveError(err?.message ?? 'Save failed')
      alert('Save failed: ' + (err?.message ?? 'Unknown error'))
    } finally {
      setIsSaving(false)
    }
  }

  // Lightweight API-save used by autosave (no alerts)
  async function apiSaveProjectSilent(proj: Project) {
    if (!authed) throw new Error('Not authenticated')
    const isObjectIdLike = typeof proj.id === 'string' && /^[0-9a-fA-F]{24}$/.test(proj.id)
    if (!isObjectIdLike) {
      const created: any = await createProject(proj)
      return created
    }
    await updateProject(proj.id, proj)
    return proj
  }

  // autosave: debounce project changes and persist automatically when authed
  useEffect(() => {
    // skip autosave on first mount/load
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }

    if (!authed) return

    // clear previous timer
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current)
    }

    autosaveTimer.current = window.setTimeout(async () => {
      setIsSaving(true)
      try {
        const res = await apiSaveProjectSilent(project)
        if (res && res.id && res.id !== project.id) {
          // if server returned a created project with real id, replace local project
          setProject(res)
        }
        setLastSavedAt(Date.now())
        setSaveError(null)
      } catch (e: any) {
        // keep error but don't block UX
        setSaveError(e?.message ?? 'Autosave failed')
      } finally {
        setIsSaving(false)
      }
    }, 1500)

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
  }, [project, authed])

  // --- Undo / Redo history helpers ---
  function applyChange(mutator: (p: Project) => Project) {
    setProject((current) => {
      const updated = mutator(JSON.parse(JSON.stringify(current)))
      // trim future history
      setHistory((h) => {
        const base = h.slice(0, historyIndex + 1)
        const next = base.concat([JSON.parse(JSON.stringify(updated))])
        // cap history length
        const MAX = 100
        if (next.length > MAX) {
          next.splice(0, next.length - MAX)
        }
        setHistoryIndex(next.length - 1)
        return next
      })
      return updated
    })
  }

  function canUndo() {
    return historyIndex > 0
  }

  function canRedo() {
    return historyIndex < history.length - 1
  }

  function undo() {
    setHistoryIndex((i) => {
      if (i <= 0) return i
      const ni = i - 1
      const snap = history[ni]
      setProject(JSON.parse(JSON.stringify(snap)))
      return ni
    })
  }

  function redo() {
    setHistoryIndex((i) => {
      if (i >= history.length - 1) return i
      const ni = i + 1
      const snap = history[ni]
      setProject(JSON.parse(JSON.stringify(snap)))
      return ni
    })
  }

  // validate token on mount: if token exists but is invalid/expired, force login
  useEffect(() => {
    let mounted = true

    ;(async () => {
      if (!getToken()) return

      try {
        await listProjects()
        if (mounted) setAuthed(true)
      } catch (err: any) {
        // if unauthorized, clear token and show login
        if (err.message && err.message.toLowerCase().includes('unauthorized') || err.message === 'Unauthorized') {
          try {
            localStorage.removeItem('app_token')
          } catch {
            /* ignore */
          }
        }

        if (mounted) setAuthed(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  function logout() {
    try {
      localStorage.removeItem('app_token')
    } catch {
      /* ignore */
    }

    setAuthed(false)
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen py-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-slate-100">
        <AppContent
          authed={authed}
          setAuthed={setAuthed}
          logout={logout}
          project={project}
          setProject={setProject}
          selectedPageId={selectedPageId}
          setSelectedPageId={setSelectedPageId}
          selectedBlock={selectedBlock}
          setSelectedBlock={setSelectedBlock}
          page={page}
          addBlock={addBlock}
          openProject={(proj: any, navigate?: (path: string) => void) => openProject(proj, navigate)}
          editBlock={editBlock}
          deleteBlock={deleteBlock}
          saveProject={saveProject}
          undo={undo}
          redo={redo}
          canUndo={canUndo()}
          canRedo={canRedo()}
          onReorder={(newBlocks: any[]) => applyChange((p) => ({
            ...p,
            pages: p.pages.map((pg) => (pg.id === selectedPageId ? { ...pg, blocks: newBlocks } : pg)),
          }))}
          isSaving={isSaving}
          lastSavedAt={lastSavedAt}
          saveError={saveError}
        />
      </div>
    </BrowserRouter>
  )
}

function AppContent(props: any) {
  const navigate = useNavigate()

  const {
    authed,
    setAuthed,
    logout,
    selectedBlock,
    setSelectedBlock,
    page,
    addBlock,
    openProject,
    editBlock,
    deleteBlock,
    saveProject,
    onReorder,
    undo,
    redo,
    canUndo,
    canRedo,
    isSaving,
    lastSavedAt,
    saveError,
  } = props

  // keyboard shortcuts for undo/redo
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      if (e.key === 'z' || e.key === 'Z') {
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
        e.preventDefault()
      } else if (e.key === 'y' || e.key === 'Y') {
        redo()
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  return (
    <>
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
          {/* editor-specific controls */}
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
              <button className="text-sm muted" onClick={() => {
                logout()
                navigate('/')
              }}>
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

      <main className={`app-grid ${window.location.pathname === '/editor' ? 'editor-mode' : ''}`}>
        <Routes>
          <Route
            path="/"
            element={(
              <section className="col-span-3">
                <Landing onLogin={() => { setAuthed(true); navigate('/dashboard') }} />
              </section>
            )}
          />

          <Route
            path="/dashboard"
            element={(
              <section className="col-span-3">
                <Dashboard onOpen={(proj: any) => openProject(proj, navigate)} />
              </section>
            )}
          />

          <Route
            path="/account"
            element={(
              <section className="col-span-3">
                <Account onBack={() => navigate('/dashboard')} />
              </section>
            )}
          />

          <Route
            path="/editor"
            element={(
              <>
                <aside className="sidebar-hidden-mobile">
                  <AddBlock onAdd={addBlock} />
                </aside>

                <section className="overflow-auto">
                  {page ? (
                    <PageRenderer
                      page={page}
                      onSelectBlock={(b: any) => setSelectedBlock(b)}
                      onUpdateBlock={editBlock}
                      onReorder={(newBlocks: any[]) => onReorder(newBlocks)}
                    />
                  ) : (
                    <div className="card">
                      <h3 className="text-lg font-medium">No page selected</h3>
                      <p className="muted">Create a page or open a project with pages to start editing.</p>
                    </div>
                  )}
                </section>

                <aside>
                  <Inspector
                    block={selectedBlock}
                    onSave={(b: any) => {
                      setSelectedBlock(null)
                      editBlock(b)
                    }}
                    onClose={() => setSelectedBlock(null)}
                    onDelete={(id: string) => {
                      setSelectedBlock(null)
                      deleteBlock(id)
                    }}
                  />
                </aside>
              </>
            )}
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  )
}

