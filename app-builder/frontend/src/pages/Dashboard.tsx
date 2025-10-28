import { useEffect, useState } from 'react'
import { listProjects, createProject } from '../api'

export default function Dashboard({ onOpen }: { onOpen: (proj: any) => void }) {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState('')

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

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Projects</h2>
          <p className="muted">Your projects — open or create a new one to edit.</p>
        </div>
        <div className="flex items-center gap-3">
          <input className="border rounded-md px-3 py-2 text-sm" placeholder="New project name" value={newName} onChange={e => setNewName(e.target.value)} />
          <button className="btn" onClick={create}>Create</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <div className="muted">Loading…</div> : projects.map(p => (
          <div key={p.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-medium">{p.name}</div>
                <div className="text-xs muted">{p.id}</div>
              </div>
              <div className="flex flex-col gap-2">
                <button className="text-sm text-primary" onClick={() => onOpen(p)}>Open</button>
                <button className="text-sm muted" onClick={() => { const name = prompt('Rename project', p.name) || ''; if (name) { /* lightweight rename on client only */ p.name = name; setProjects(ps => ps.map(x => x.id===p.id ? { ...x, name } : x)); } }}>Rename</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
