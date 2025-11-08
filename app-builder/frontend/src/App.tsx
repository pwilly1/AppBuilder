import { Preview } from './editor/Preview'
import { useMemo, useState, useEffect } from 'react'
import type { Project, Page, Block } from './shared/BlockTypes'

import { PageRenderer } from './PageRenderer'
import { PageList } from './PageList'
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
  const [selectedPageId, setSelectedPageId] = useState<string>(() => project.pages?.[0]?.id ?? '')
  const [selectedBlock, setSelectedBlock] = useState<any | null>(null)

  const page = useMemo(() => project.pages.find((p) => p.id === selectedPageId), [project, selectedPageId])

  // page rename / add helpers intentionally removed (not used in current UI)

  const addBlock = (b: Block) => {
    setProject((p) => ({
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

    setProject(full)
    setSelectedPageId(full.pages[0].id)

    if (navigate) navigate('/editor')
  }

  function editBlock(updated: Block) {
    setProject((p) => ({
      ...p,
      pages: p.pages.map((pg) => (pg.id === selectedPageId ? { ...pg, blocks: pg.blocks.map((b) => (b.id === updated.id ? updated : b)) } : pg)),
    }))
  }

  function deleteBlock(id: string) {
    setProject((p) => ({
      ...p,
      pages: p.pages.map((pg) => (pg.id === selectedPageId ? { ...pg, blocks: pg.blocks.filter((b) => b.id !== id) } : pg)),
    }))
  }

  async function saveProject() {
    try {
      // if project.id is a temporary local id (not a 24-char Mongo ObjectId), create it first
      const isObjectIdLike = typeof project.id === 'string' && /^[0-9a-fA-F]{24}$/.test(project.id)

      if (!isObjectIdLike) {
        const created: any = await createProject(project)
        // replace local project with the created server project which includes real id
        setProject(created)
        alert('Project created')
        return
      }

      await updateProject(project.id, project)
      alert('Project saved')
    } catch (err: any) {
      // if server returned 403, likely a guest attempted a forbidden action
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

      alert('Save failed: ' + err.message)
    }
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
    project,
    setProject,
    selectedPageId,
    setSelectedPageId,
    selectedBlock,
    setSelectedBlock,
    page,
    addBlock,
    openProject,
    editBlock,
    deleteBlock,
    saveProject,
  } = props

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
              <button className="text-sm muted" onClick={() => navigate('/dashboard')}>
                ← Dashboard
              </button>
              <button className="btn" onClick={saveProject}>
                Save
              </button>
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
                      onReorder={(newBlocks: any[]) =>
                        setProject((p: Project) => ({
                          ...p,
                          pages: p.pages.map((pg) => (pg.id === selectedPageId ? { ...pg, blocks: newBlocks } : pg)),
                        }))
                      }
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

