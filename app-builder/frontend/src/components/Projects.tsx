import React, { useEffect, useState } from 'react';
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
    <div>
      <h3>Your projects</h3>
      {err ? <div style={{ color: 'red' }}>{err}</div> : null}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New project name" />
        <button onClick={create}>Create</button>
      </div>
      <ul>
        {projects.map(p => (
          <li key={p.id} style={{ marginBottom: 8 }}>
            <strong>{p.name}</strong>
            <div>
              <button onClick={() => open(p.id)}>Open</button>
              <button onClick={() => rename(p.id)}>Rename</button>
              <button onClick={() => remove(p.id)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
