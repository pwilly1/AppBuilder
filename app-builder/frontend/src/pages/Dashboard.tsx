import { useEffect, useMemo, useState } from 'react';
import {
  createProject,
  deleteProject,
  listProjects,
} from '../api';
import { Link } from 'react-router-dom';
import type { Block } from '../shared/schema/types';

type ProjectRecord = {
  id: string;
  name: string;
  ownerId?: string;
  updatedAt?: string;
  createdAt?: string;
  pages?: Array<{
    id: string;
    title?: string;
    blocks?: Block[];
  }>;
};

function TopNav({ search, setSearch }: { search: string; setSearch: (s: string) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-2">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100/70">Workspace</div>
        <div className="section-heading text-3xl font-semibold text-white">Project studio</div>
      </div>
      <div className="max-w-md flex-1">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search projects" placeholder="Search projects..."
          className="field-input !rounded-full !bg-[#fffcf6]"
        />
      </div>
    </div>
  );
}

function Sidebar() {
  const items = [
    { key: 'projects', label: 'Projects', icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zM13 21h8V11h-8v10zM13 3v6h8V3h-8z" fill="currentColor"/></svg>) },
    { key: 'analytics', label: 'Analytics', icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 3h2v18H3V3zm6 6h2v12H9V9zm6-4h2v16h-2V5zm6 8h2v8h-2v-8z" fill="currentColor"/></svg>) },
    { key: 'settings', label: 'Settings', icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19.14 12.936a7.994 7.994 0 000-1.872l2.036-1.58a.5.5 0 00.12-.637l-1.928-3.337a.5.5 0 00-.607-.22l-2.396.96a7.99 7.99 0 00-1.62-.94l-.36-2.54A.5.5 0 0013.65 2h-3.3a.5.5 0 00-.496.42l-.36 2.54a7.99 7.99 0 00-1.62.94l-2.396-.96a.5.5 0 00-.607.22L2.7 9.447a.5.5 0 00.12.637l2.036 1.58a7.994 7.994 0 000 1.872l-2.036 1.58a.5.5 0 00-.12.637l1.928 3.337c.14.242.44.344.68.243l2.396-.96c.5.34 1.04.62 1.62.94l.36 2.54c.05.28.28.48.56.48h3.3c.28 0 .51-.2.56-.48l.36-2.54c.58-.32 1.12-.6 1.62-.94l2.396.96c.24.100.54-.001.68-.243l1.928-3.337a.5.5 0 00-.12-.637l-2.036-1.58z" fill="currentColor"/></svg>) },
  ];

  return (
    <nav className="shell-panel hidden rounded-[1.75rem] p-4 md:flex md:w-56 md:flex-col lg:w-64">
      <div className="mb-4 rounded-2xl border border-slate-200/60 bg-white/45 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Control center</div>
        <div className="mt-1 text-sm font-semibold text-slate-900">Builder workspace</div>
      </div>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.key} className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-slate-700 transition-colors hover:bg-white/70 ${it.key === 'projects' ? 'bg-white/75 shadow-sm' : ''}`}>
            <div className="text-slate-500">{it.icon}</div>
            {it.key === 'settings' ? <Link className="text-sm font-medium hover:underline" to="/account">Account settings</Link> : <span className="text-sm font-medium">{it.label}</span>}
            {it.key === 'analytics' && <span className="ml-auto text-xs text-slate-500">Coming soon</span>}
          </li>
        ))}
      </ul>
    </nav>
  );
}

function ProjectCard({
  project,
  onOpen,
  onDelete,
  onViewData,
}: {
  project: ProjectRecord;
  onOpen: (project: ProjectRecord) => void;
  onDelete: (project: ProjectRecord) => void;
  onViewData: (project: ProjectRecord) => void;
}) {
  const pages = project.pages ?? [];
  const blocks = pages[0]?.blocks ?? [];
  const headline = blocks.find((block) => block.type === 'hero')?.props.headline;
  const description = blocks.find((block) => block.type === 'text' && !block.props.editable)?.props.value;
  const updated = project?.updatedAt
    ? new Date(project.updatedAt).toLocaleDateString()
    : project?.createdAt
      ? new Date(project.createdAt).toLocaleDateString()
      : '';
  return (
    <div className="group shell-panel rounded-[1.85rem] p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_34px_72px_rgba(7,17,31,0.22)]">
      <button type="button" className="project-cover" onClick={() => onOpen(project)} aria-label={`Open ${project.name}`}>
        <span className="project-cover-title">{typeof headline === 'string' && headline.trim() ? headline : project.name}</span>
        <span className="project-cover-copy">{typeof description === 'string' && description.trim() ? description : 'Your next app starts here.'}</span>
        <span className="project-cover-footer">{pages.length} {pages.length === 1 ? 'page' : 'pages'}<span aria-hidden="true">Open editor</span></span>
      </button>
      <div className="mt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold text-slate-800" title={project.name}>{project.name}</div>
            <div className="mt-1 text-xs text-slate-500">{updated && updated !== 'Invalid Date' ? `Updated ${updated}` : 'Not edited yet'}</div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-sm min-w-[88px]" onClick={() => onOpen(project)}>Open</button>
          <button className="ghost-btn !px-4 !py-2 !text-xs !font-semibold" onClick={() => onViewData(project)}>
            Data
          </button>
          <details className="project-card-menu ml-auto relative" onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.currentTarget.open = false;
              event.currentTarget.querySelector('summary')?.focus();
            }
          }} onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) event.currentTarget.open = false;
          }}>
            <summary className="ghost-btn !px-3 !py-2 !text-sm" aria-label={`More options for ${project.name}`}>More</summary>
            <div className="absolute right-0 bottom-full z-10 mb-2 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
              <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50" onClick={(event) => {
                event.currentTarget.closest('details')?.removeAttribute('open');
                onDelete(project);
              }}>Delete project</button>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({
  onOpen,
  onViewData,
}: {
  onOpen: (project: ProjectRecord) => void;
  onViewData: (project: ProjectRecord) => void;
}) {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [namingProject, setNamingProject] = useState(false);
  const [newName, setNewName] = useState('');
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await listProjects();
      const normalized = (res || []).map((project: any) => ({ ...project, id: project.id ?? project._id }));
      setProjects(normalized);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    setError(null);

    try {
      const res: any = await createProject(name);
      const normalized = { ...res, id: res.id ?? res._id };
      setProjects((prev) => [normalized, ...prev]);
      setNewName('');
      setNamingProject(false);
      onOpen(normalized);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  function cancelCreate() {
    if (creating) return;
    setNewName('');
    setNamingProject(false);
  }

  async function remove(id: string) {
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((project) => project.id !== id));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    }
  }

  const filtered = useMemo(
    () =>
      projects.filter(
        (project) =>
          project.name?.toLowerCase().includes(search.trim().toLowerCase())
      ),
    [projects, search]
  );

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1600px] px-4 py-6">
        <TopNav search={search} setSearch={setSearch} />
        <div className="mt-2 rounded-lg bg-transparent shadow-none">
          <div className="flex gap-4">
            <Sidebar />
            <main className="min-w-0 flex-1">
              <div className="shell-panel mb-4 rounded-[1.9rem] p-5">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Workspace</div>
                  <h2 className="section-heading text-4xl font-semibold text-slate-950">Projects</h2>
                  <p className="muted max-w-2xl">Open a saved app, review submissions, or start a new native-ready project.</p>
                </div>
                {namingProject ? (
                  <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-[#fffcf6]/90 p-3 shadow-sm sm:min-w-[320px]">
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500" htmlFor="new-project-name">
                      Project name
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        id="new-project-name"
                        autoFocus
                        className="field-input !min-w-0 !flex-1 !rounded-full !px-4 !py-3"
                        placeholder="Example: Client portal"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void create();
                          if (e.key === 'Escape') cancelCreate();
                        }}
                      />
                      <button className="btn" disabled={!newName.trim() || creating} onClick={create}>
                        {creating ? 'Creating...' : 'Create'}
                      </button>
                      <button className="ghost-btn !px-4 !py-3 !text-sm" onClick={cancelCreate}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button className="btn whitespace-nowrap" onClick={() => setNamingProject(true)}>
                    New Project
                  </button>
                )}
              </div>

              {error && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <span>{error}</span><button type="button" className="ghost-btn !px-3 !py-2" onClick={() => void load()}>Reload projects</button>
              </div>}
              <div aria-busy={loading} className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {loading ? (
                  <div role="status" className="col-span-full rounded-2xl border border-slate-200 bg-white/60 p-8 text-center text-slate-500">Loading your projects...</div>
                ) : filtered.length ? (
                  filtered.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onOpen={onOpen}
                      onViewData={onViewData}
                      onDelete={(target) => {
                        if (window.confirm(`Delete project "${target.name}"? This cannot be undone.`)) {
                          void remove(target.id);
                        }
                      }}
                    />
                  ))
                ) : (
                  <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white/50 px-6 py-12 text-center">
                    <h3 className="text-xl font-semibold text-slate-900">{search.trim() ? 'No matching projects' : error ? 'Projects unavailable' : 'Create your first app'}</h3>
                    <p className="mt-2 text-sm text-slate-500">{search.trim() ? 'Try a different name or clear your search.' : error ? 'Reload to try again.' : 'Start a project, add a page, and make it your own.'}</p>
                    {search.trim() && <button className="ghost-btn mt-4" onClick={() => setSearch('')}>Clear search</button>}
                  </div>
                )}
              </div>
              </div>
            </main>
          </div>
        </div>
      </div>

    </div>
  );
}
