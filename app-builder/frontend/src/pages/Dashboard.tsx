import { useEffect, useState, useMemo } from 'react'
import { listProjects, createProject, deleteProject } from '../api'
import { BlockRenderer } from '../shared/BlockRenderer'

function TopNav({ search, setSearch }: { search: string; setSearch: (s: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">


      <div className="flex-1 max-w-xl">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects or owners..." className="w-full bg-slate-700/10 border border-slate-200/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/20" />
      </div>
    </div>
  )
}

function Sidebar() {
  const items = [
    { key: 'dashboard', label: 'Dashboard', icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zM13 21h8V11h-8v10zM13 3v6h8V3h-8z" fill="currentColor"/></svg>) },
    { key: 'projects', label: 'Projects', icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zM13 21h8V11h-8v10zM13 3v6h8V3h-8z" fill="currentColor"/></svg>) },
    { key: 'analytics', label: 'Analytics', icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 3h2v18H3V3zm6 6h2v12H9V9zm6-4h2v16h-2V5zm6 8h2v8h-2v-8z" fill="currentColor"/></svg>) },
    { key: 'settings', label: 'Settings', icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19.14 12.936a7.994 7.994 0 000-1.872l2.036-1.58a.5.5 0 00.12-.637l-1.928-3.337a.5.5 0 00-.607-.22l-2.396.96a7.99 7.99 0 00-1.62-.94l-.36-2.54A.5.5 0 0013.65 2h-3.3a.5.5 0 00-.496.42l-.36 2.54a7.99 7.99 0 00-1.62.94l-2.396-.96a.5.5 0 00-.607.22L2.7 9.447a.5.5 0 00.12.637l2.036 1.58a7.994 7.994 0 000 1.872l-2.036 1.58a.5.5 0 00-.12.637l1.928 3.337c.14.242.44.344.68.243l2.396-.96c.5.34 1.04.62 1.62.94l.36 2.54c.05.28.28.48.56.48h3.3c.28 0 .51-.2.56-.48l.36-2.54c.58-.32 1.12-.6 1.62-.94l2.396.96c.24.100.54-.001.68-.243l1.928-3.337a.5.5 0 00-.12-.637l-2.036-1.58z" fill="currentColor"/></svg>) },
  ]
  return (
    <nav className="hidden md:flex md:flex-col md:w-56 lg:w-64 p-4 border-r border-slate-200/5">
      <ul className="space-y-2">
        {items.map(it => (
          <li key={it.key} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-700/10 cursor-pointer">
            <div className="text-slate-300">{it.icon}</div>
            <div className="font-medium text-sm">{it.label}</div>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function ProjectCard({ p, onOpen, onDelete }: { p: any; onOpen: (proj: any) => void; onDelete: (proj: any) => void }) {
  const firstBlock = p?.pages?.[0]?.blocks?.[0]
  const updated = p?.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : (p?.createdAt ? new Date(p.createdAt).toLocaleDateString() : '')
  const progress = Math.min(100, (p?.pages?.[0]?.blocks?.length ?? 0) * 20)
  return (
    <div className="bg-slate-800/5 rounded-xl p-4 hover:shadow-lg transition-shadow duration-200 group">
      <div className="rounded-md overflow-hidden bg-white shadow-sm" style={{ height: 160 }}>
        <div className="w-full h-full p-3 bg-gradient-to-b from-white to-slate-50">
          {firstBlock ? (
            <div className="w-full h-full scale-90 transform origin-top-left">
              <BlockRenderer block={firstBlock} />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-slate-400">No preview</div>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold text-slate-800 truncate" title={p.name}>{p.name}</div>
          <div className="text-xs muted mt-1">Updated {updated} · {p.ownerId ?? 'You'}</div>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-sm font-medium text-primary">{progress}%</div>
          <div className="flex gap-2 mt-2">
            <button className="btn-sm" onClick={() => onOpen(p)}>Open</button>
            <button className="btn-sm !bg-red-600/90 hover:!bg-red-700" onClick={() => onDelete(p)}>Delete</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard({ onOpen }: { onOpen: (proj: any) => void }) {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res: any = await listProjects()
      const normalized = (res || []).map((p: any) => ({ ...p, id: p.id ?? p._id }))
      setProjects(normalized)
    } catch (e: any) {
      console.error(e)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function create() {
    try {
      const res: any = await createProject(newName || 'Untitled')
      const normalized = { ...res, id: res.id ?? res._id }
      setProjects(prev => [normalized, ...prev])
      setNewName('')
      onOpen(normalized)
    } catch (e: any) { console.error(e) }
  }

  async function remove(id: string) {
    try {
      await deleteProject(id)
      setProjects(prev => prev.filter(p => p.id !== id))
    } catch (e: any) { console.error(e) }
  }

  const filtered = useMemo(() => projects.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || (p.ownerId || '').toLowerCase().includes(search.toLowerCase())), [projects, search])

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <TopNav search={search} setSearch={setSearch} />
        <div className="mt-6 bg-transparent rounded-lg shadow-none">
          <div className="flex">
            <Sidebar />
            <main className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-semibold">Projects</h2>
                  <p className="muted">A snapshot of your work — click a project to open the editor.</p>
                </div>
                <div className="flex items-center gap-3">
                  <input className="border rounded-full px-3 py-2 text-sm" placeholder="New project name" value={newName} onChange={e => setNewName(e.target.value)} />
                  <button className="btn" onClick={create}>Create</button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? <div className="muted">Loading…</div> : (filtered.length ? filtered.map(p => (
                  <ProjectCard key={p.id} p={p} onOpen={onOpen} onDelete={(proj: any) => {
                    if (window.confirm(`Delete project "${proj.name}"? This cannot be undone.`)) {
                      remove(proj.id)
                    }
                  }} />
                )) : (
                  <div className="muted">No projects found</div>
                ))}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
