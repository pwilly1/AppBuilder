import { useEffect, useState } from 'react';
import { listProjects, createProject, updateProject, deleteProject, getProject } from '../api';

export default function Projects({ onOpen }: { onOpen?: (proj: any) => void }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [newName, setNewName] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      const res: any = await listProjects();
      const normalized = (res || []).map((p: any) => ({ ...p, id: p.id ?? p._id }));
      setProjects(normalized);
    } catch (e: any) { setErr(e.message); }
  }

  useEffect(() => { load(); }, []);

  async function create() {
    try {
      const res: any = await createProject(newName || 'Untitled');
      const normalized = { ...res, id: res.id ?? res._id };
      setProjects(prev => [normalized, ...prev]);
      setNewName('');
    } catch (e: any) { setErr(e.message); }
  }

  async function remove(id: string) {
    try {
      await deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (e: any) { setErr(e.message); }
  }

  async function rename(id: string) {
    const name = prompt('New name') || '';
    if (!name) return;
    try {
      const res: any = await updateProject(id, { name });
      setProjects(prev => prev.map(p => p.id === id ? res : p));
    } catch (e: any) { setErr(e.message); }
  }

  async function open(id: string) {
    try {
      const res: any = await getProject(id);
      if (onOpen) onOpen(res);
    } catch (e: any) { setErr(e.message); }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Projects</h3>
        <button className="text-sm muted" onClick={load}>Refresh</button>
      </div>
      {err ? <div className="text-red-500 text-sm mb-2">{err}</div> : null}
      <div className="flex gap-2 mb-3">
        <input className="flex-1 border rounded-md px-3 py-2 text-sm" value={newName} onChange={e => setNewName(e.target.value)} placeholder="New project name" />
        <button className="btn" onClick={create}>Create</button>
      </div>
      <ul className="space-y-2">
        {projects.map(p => (
          <li key={p.id} className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{p.name}</div>
              <div className="text-xs muted">{p.id}</div>
            </div>
            <div className="flex items-center gap-2">
              <button className="text-sm text-primary hover:underline" onClick={() => open(p.id)}>Open</button>
              <button className="text-sm muted" onClick={() => rename(p.id)}>Rename</button>
              <button className="text-sm text-red-500" onClick={() => remove(p.id)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
