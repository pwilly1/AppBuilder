import { Preview } from './editor/Preview'
import { useMemo, useState } from 'react'
import type { Project, Page, Block } from './shared/BlockTypes'
import { PageRenderer } from './PageRenderer'
import { PageList } from './PageList'
import { AddBlock } from './AddBlock'
import Inspector from './components/Inspector'
import Login from './components/Login'
import Signup from './components/Signup'
import Projects from './components/Projects'
import { getProject, updateProject, createProject, getToken, guest, setToken, listProjects } from './api'
import { useEffect } from 'react'


const initialProject: Project = {
  id: 'proj1',
  name: 'My App',
  pages: [
    {
      id: 'home', title: 'Home', path: '/home',
      blocks: [
        { id: 'b1', type: 'hero', props: { headline: 'Welcome to My App', subhead:'Edit me' } },
        { id: 'b2', type: 'text', props: { value: 'This is a text block.' } },
      ]
    },
    { id: 'contact', title: 'Contact', path: '/contact', blocks: [] },
  ],
}

export default function App() {
  const [authed, setAuthed] = useState<boolean>(() => !!getToken());
  const [project, setProject] = useState<Project>(initialProject)
  const [selectedPageId, setSelectedPageId] = useState<string>(() => project.pages?.[0]?.id ?? '')
  const [selectedBlock, setSelectedBlock] = useState<any | null>(null)

  const page = useMemo(
    () => project.pages.find(p => p.id === selectedPageId),
    [project, selectedPageId]
  )

  const renamePage = (id:string, title:string) => {
    setProject(p => ({
      ...p,
      pages: p.pages.map(pg => pg.id===id ? { ...pg, title } : pg)
    }))
  }

  const addPage = () => {
    const title = prompt('Page title', 'New Page')?.trim()
    if (!title) return
    const id = crypto.randomUUID()
    setProject(p => ({
      ...p,
      pages: [...p.pages, { id, title, path: `/${title.toLowerCase().replace(/\\s+/g,'-')}`, blocks: [] }]
    }))
    setSelectedPageId(id)
  }

  const addBlock = (b: Block) => {
    setProject(p => ({
      ...p,
      pages: p.pages.map(pg => pg.id===selectedPageId ? { ...pg, blocks: [...pg.blocks, b] } : pg)
    }))
  }

  async function openProject(proj: any) {
    // proj may be a summary (no pages) or a full project; fetch if necessary
    let full = proj;
    if (!full.pages) {
      full = await getProject(proj.id);
    }

    // ensure the project has at least one page so the editor has something to render
    if (!full.pages || full.pages.length === 0) {
      const id = crypto.randomUUID();
      full.pages = [{ id, title: 'Home', path: '/home', blocks: [] }];
    }

    setProject(full);
    setSelectedPageId(full.pages[0].id);
  }

  function editBlock(updated: Block) {
    setProject(p => ({
      ...p,
      pages: p.pages.map(pg => pg.id===selectedPageId ? { ...pg, blocks: pg.blocks.map(b => b.id===updated.id ? updated : b) } : pg)
    }))
  }

  function deleteBlock(id: string) {
    setProject(p => ({
      ...p,
      pages: p.pages.map(pg => pg.id===selectedPageId ? { ...pg, blocks: pg.blocks.filter(b => b.id!==id) } : pg)
    }))
  }

  async function saveProject() {
    try {
      // if project.id is a temporary local id (not a 24-char Mongo ObjectId), create it first
      const isObjectIdLike = typeof project.id === 'string' && /^[0-9a-fA-F]{24}$/.test(project.id);
      if (!isObjectIdLike) {
        const created: any = await createProject(project);
        // replace local project with the created server project which includes real id
        setProject(created);
        alert('Project created');
        return;
      }
      await updateProject(project.id, project);
      alert('Project saved');
    } catch (err: any) {
      // if server returned 403, likely a guest attempted a forbidden action
      if (err?.status === 403) {
        try { localStorage.removeItem('app_token'); } catch {}
        setAuthed(false);
        alert('Guests cannot save projects. Please sign up or log in to save.');
        return;
      }
      alert('Save failed: ' + err.message);
    }
  }

  // validate token on mount: if token exists but is invalid/expired, force login
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!getToken()) return;
      try {
        await listProjects();
        if (mounted) setAuthed(true);
      } catch (err: any) {
        // if unauthorized, clear token and show login
        if (err.message && err.message.toLowerCase().includes('unauthorized') || err.message === 'Unauthorized') {
          try { localStorage.removeItem('app_token'); } catch {}
        }
        if (mounted) setAuthed(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  if (!authed) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Please log in or sign up</h2>
        <div style={{ display: 'flex', gap: 16 }}>
          <Login onLogin={() => setAuthed(true)} />
          <Signup onSignup={() => setAuthed(true)} />
         <button onClick={async () => {
              try {
                const res: any = await guest();
                if (res?.token) {
                  setToken(res.token);
                }
                setAuthed(true);
              } catch (err: any) {
                alert('Guest login failed: ' + err.message);
              }
            }}
          >
            Continue as Guest
          </button>
         </div>
       </div>
    )
  }

  return (
    <div className="app-grid">
      <div style={{ padding: 12 }}>
        <Projects onOpen={openProject} />
        <div style={{ marginTop: 12 }}>
          <button onClick={saveProject}>Save project</button>
        </div>
      </div>
      <div style={{ padding:16, overflow:'auto' }}>
        {page ? (
          <PageRenderer page={page} onSelectBlock={b => setSelectedBlock(b)} onEditBlock={b => {
          const updated = { ...b };
          // show a simple editor depending on block type
          if (b.type === 'text') {
            const v = prompt('Edit text', String(b.props?.value ?? ''));
            if (v == null) return;
            updated.props = { ...updated.props, value: v } as any;
          } else if (b.type === 'hero') {
            const h = prompt('Headline', String(b.props?.headline ?? ''));
            if (h == null) return;
            updated.props = { ...updated.props, headline: h } as any;
          }
          editBlock(updated);
          }} onDeleteBlock={deleteBlock} />
        ) : (
          <div style={{ padding: 24 }}>
            <h3>No page selected</h3>
            <p>Create a page or open a project with pages to start editing.</p>
          </div>
        )}
      </div>
      <div>
        <AddBlock onAdd={addBlock} />
        <Inspector block={selectedBlock} onSave={(b:any)=>{ setSelectedBlock(null); editBlock(b); }} onClose={()=>setSelectedBlock(null)} />
      </div>
    </div>
  )
}

