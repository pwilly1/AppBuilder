import { useEffect, useMemo, useState } from 'react';
import {
  createProject,
  deleteProject,
  exportProjectAppDataCsv,
  getProject,
  listProjectAppDataRecords,
  listProjectAppDataSources,
  listProjects,
  type ProjectAppDataRecord,
  type ProjectAppDataSource,
} from '../api';
import { BlockRenderer } from '../shared/BlockRenderer';
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
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100/70">Workspace</div>
        <div className="section-heading text-3xl font-semibold text-white">Project studio</div>
      </div>
      <div className="max-w-md flex-1">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects or owners..."
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
          <li key={it.key} className={`flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-slate-700 transition-colors hover:bg-white/70 ${it.key === 'projects' ? 'bg-white/75 shadow-sm' : ''}`}>
            <div className="text-slate-500">{it.icon}</div>
            <div className="text-sm font-medium">{it.label}</div>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function formatSubmissionValue(value?: string | boolean) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return value && value.trim() ? value : '-';
}

function formatSubmissionLabel(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getSubmissionSummary(data: ProjectAppDataRecord['data']) {
  if (typeof data.name === 'string' && data.name.trim()) return data.name;
  const firstTextValue = Object.values(data).find((value): value is string => typeof value === 'string' && value.trim().length > 0);
  return firstTextValue || 'Submission';
}

function SubmissionDrawer({
  project,
  loadingProject,
  projectError,
  selectedBlockId,
  submissions,
  sources,
  loadingSubmissions,
  submissionsError,
  exportingCsv,
  onClose,
  onSelectBlock,
  onExportCsv,
}: {
  project: ProjectRecord | null;
  loadingProject: boolean;
  projectError: string;
  selectedBlockId: string;
  submissions: ProjectAppDataRecord[];
  sources: ProjectAppDataSource[];
  loadingSubmissions: boolean;
  submissionsError: string;
  exportingCsv: boolean;
  onClose: () => void;
  onSelectBlock: (blockId: string) => void;
  onExportCsv: () => void;
}) {
  const selectedSource = sources.find((source) => source.sourceId === selectedBlockId) || sources[0];
  const sortedSubmissions = [...submissions].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
      <div className="mx-auto flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">App Data</h3>
            <p className="mt-1 text-sm text-slate-500">
              {project ? `Hosted records for ${project.name}` : 'Loading project data'}
            </p>
          </div>
          <button className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="grid flex-1 gap-0 overflow-hidden md:grid-cols-[280px_1fr]">
          <aside className="border-b border-slate-200 bg-slate-50 p-5 md:border-b-0 md:border-r">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Data sources</h4>
            {loadingProject ? <p className="mt-4 text-sm text-slate-500">Loading data sources...</p> : null}
            {!loadingProject && projectError ? <p className="mt-4 text-sm text-red-600">{projectError}</p> : null}
            {!loadingProject && !projectError && sources.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">This project does not have any app data sources yet.</p>
            ) : null}
            <div className="mt-4 space-y-3">
              {sources.map((source) => (
                <button
                  key={source.sourceId}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                    source.sourceId === selectedSource?.sourceId
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300'
                  }`}
                  onClick={() => onSelectBlock(source.sourceId)}
                >
                  <div className="text-sm font-semibold">{source.name}</div>
                  <div className={`mt-1 text-xs ${source.sourceId === selectedSource?.sourceId ? 'text-slate-300' : 'text-slate-500'}`}>
                    {source.pageTitle}
                  </div>
                  <div className={`mt-2 text-xs ${source.sourceId === selectedSource?.sourceId ? 'text-slate-300' : 'text-slate-500'}`}>
                    {source.recordCount} records | {source.type === 'contactForm' ? 'Legacy contact form' : 'Hosted app data'}
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <section className="flex min-h-0 flex-col p-6">
            {selectedSource ? (
              <>
                <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">{selectedSource.name}</div>
                    <div className="mt-1 text-sm text-slate-500">{selectedSource.pageTitle}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-sm text-slate-500">
                      <div>{sortedSubmissions.length} records</div>
                      <div>{selectedSource.fields.length} fields</div>
                    </div>
                    <button
                      type="button"
                      className="ghost-btn !px-4 !py-2 !text-xs !font-semibold"
                      disabled={exportingCsv || sortedSubmissions.length === 0}
                      onClick={onExportCsv}
                    >
                      {exportingCsv ? 'Exporting...' : 'Export CSV'}
                    </button>
                  </div>
                </div>

                <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
                  {loadingSubmissions ? <p className="text-sm text-slate-500">Loading submissions...</p> : null}
                  {!loadingSubmissions && submissionsError ? <p className="text-sm text-red-600">{submissionsError}</p> : null}
                  {!loadingSubmissions && !submissionsError && sortedSubmissions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                      No records yet for this data source.
                    </div>
                  ) : null}
                  <div className="space-y-4">
                    {sortedSubmissions.map((submission) => (
                      <article key={submission.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h5 className="text-sm font-semibold text-slate-900">
                              {getSubmissionSummary(submission.data)}
                            </h5>
                            <p className="mt-1 text-xs text-slate-500">
                              {new Date(submission.submittedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                          {Object.entries(submission.data).map(([key, value]) => (
                            <div key={key} className={typeof value === 'string' && value.length > 80 ? 'sm:col-span-2' : ''}>
                              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{formatSubmissionLabel(key)}</dt>
                              <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{formatSubmissionValue(value)}</dd>
                            </div>
                          ))}
                        </dl>
                      </article>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                Select a project with app data sources to review records.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  onOpen,
  onDelete,
  onViewSubmissions,
}: {
  project: ProjectRecord;
  onOpen: (project: ProjectRecord) => void;
  onDelete: (project: ProjectRecord) => void;
  onViewSubmissions: (project: ProjectRecord) => void;
}) {
  const firstBlock = project?.pages?.[0]?.blocks?.[0];
  const updated = project?.updatedAt
    ? new Date(project.updatedAt).toLocaleDateString()
    : project?.createdAt
      ? new Date(project.createdAt).toLocaleDateString()
      : '';
  const progress = Math.min(100, (project?.pages?.[0]?.blocks?.length ?? 0) * 20);

  return (
    <div className="group shell-panel rounded-[1.85rem] p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_34px_72px_rgba(7,17,31,0.22)]">
      <div className="overflow-hidden rounded-[1.35rem] border border-slate-200/70 bg-white shadow-sm" style={{ height: 170 }}>
        <div className="h-full w-full bg-[linear-gradient(180deg,#fffcf6_0%,#eff6ff_100%)] p-3">
          {firstBlock ? (
            <div className="h-full w-full origin-top-left scale-90 transform">
              <BlockRenderer block={firstBlock} />
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">No preview</div>
          )}
        </div>
      </div>
      <div className="mt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold text-slate-800" title={project.name}>{project.name}</div>
            <div className="mt-1 text-xs text-slate-500">Updated {updated} | {project.ownerId ?? 'You'}</div>
          </div>
          <div className="rounded-full border border-blue-200/60 bg-[rgba(37,99,235,0.10)] px-3 py-1 text-xs font-semibold text-[var(--accent-deep)]">
            {progress}% built
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-sm min-w-[88px]" onClick={() => onOpen(project)}>Open</button>
          <button className="ghost-btn !px-4 !py-2 !text-xs !font-semibold" onClick={() => onViewSubmissions(project)}>
            Submissions
          </button>
          <button className="ghost-btn !px-4 !py-2 !text-xs !font-semibold !text-red-700" onClick={() => onDelete(project)}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({ onOpen }: { onOpen: (project: ProjectRecord) => void }) {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [namingProject, setNamingProject] = useState(false);
  const [newName, setNewName] = useState('');
  const [search, setSearch] = useState('');

  const [submissionProjectId, setSubmissionProjectId] = useState<string | null>(null);
  const [submissionProject, setSubmissionProject] = useState<ProjectRecord | null>(null);
  const [selectedSubmissionBlockId, setSelectedSubmissionBlockId] = useState('');
  const [appDataSources, setAppDataSources] = useState<ProjectAppDataSource[]>([]);
  const [submissionList, setSubmissionList] = useState<ProjectAppDataRecord[]>([]);
  const [loadingSubmissionProject, setLoadingSubmissionProject] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [submissionProjectError, setSubmissionProjectError] = useState('');
  const [submissionListError, setSubmissionListError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await listProjects();
      const normalized = (res || []).map((project: any) => ({ ...project, id: project.id ?? project._id }));
      setProjects(normalized);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!submissionProjectId) {
      setSubmissionProject(null);
      setSelectedSubmissionBlockId('');
      setAppDataSources([]);
      setSubmissionList([]);
      setSubmissionProjectError('');
      setSubmissionListError('');
      return;
    }

    let cancelled = false;

    async function loadSubmissionProject(projectId: string) {
      setLoadingSubmissionProject(true);
      setSubmissionProjectError('');
      try {
        const [res, sources]: [any, ProjectAppDataSource[]] = await Promise.all([
          getProject(projectId),
          listProjectAppDataSources(projectId),
        ]);
        if (cancelled) return;
        const normalized: ProjectRecord = { ...res, id: res.id ?? res._id };
        setSubmissionProject(normalized);
        setAppDataSources(sources || []);
        setSelectedSubmissionBlockId((current) => {
          if (current && sources.some((source) => source.sourceId === current)) return current;
          return sources[0]?.sourceId || '';
        });
      } catch (error: any) {
        if (cancelled) return;
        setSubmissionProject(null);
        setSelectedSubmissionBlockId('');
        setAppDataSources([]);
        setSubmissionProjectError(error?.message || 'Failed to load project submissions.');
      } finally {
        if (!cancelled) setLoadingSubmissionProject(false);
      }
    }

    void loadSubmissionProject(submissionProjectId);

    return () => {
      cancelled = true;
    };
  }, [submissionProjectId]);

  useEffect(() => {
    if (!submissionProject?.id || !selectedSubmissionBlockId) {
      setSubmissionList([]);
      setSubmissionListError('');
      return;
    }

    let cancelled = false;

    async function loadSubmissions(projectId: string, blockId: string) {
      setLoadingSubmissions(true);
      setSubmissionListError('');
      try {
        const res = await listProjectAppDataRecords(projectId, blockId);
        if (!cancelled) setSubmissionList(res || []);
      } catch (error: any) {
        if (!cancelled) {
          setSubmissionList([]);
          setSubmissionListError(error?.message || 'Failed to load submissions.');
        }
      } finally {
        if (!cancelled) setLoadingSubmissions(false);
      }
    }

    void loadSubmissions(submissionProject.id, selectedSubmissionBlockId);

    return () => {
      cancelled = true;
    };
  }, [selectedSubmissionBlockId, submissionProject?.id]);

  async function create() {
    const name = newName.trim();
    if (!name) return;

    try {
      const res: any = await createProject(name);
      const normalized = { ...res, id: res.id ?? res._id };
      setProjects((prev) => [normalized, ...prev]);
      setNewName('');
      setNamingProject(false);
      onOpen(normalized);
    } catch (error) {
      console.error(error);
    }
  }

  function cancelCreate() {
    setNewName('');
    setNamingProject(false);
  }

  async function remove(id: string) {
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((project) => project.id !== id));
      if (submissionProjectId === id) {
        setSubmissionProjectId(null);
      }
    } catch (error) {
      console.error(error);
    }
  }

  function slugifyFilePart(value: string) {
    return (
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'app-data'
    );
  }

  async function exportSelectedCsv() {
    if (!submissionProject?.id || !selectedSubmissionBlockId) return;

    const selectedSource = appDataSources.find((source) => source.sourceId === selectedSubmissionBlockId);
    setExportingCsv(true);
    setSubmissionListError('');
    try {
      const csv = await exportProjectAppDataCsv(submissionProject.id, selectedSubmissionBlockId);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${slugifyFilePart(submissionProject.name)}-${slugifyFilePart(selectedSource?.name || 'app-data')}-records.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      setSubmissionListError(error?.message || 'Failed to export CSV.');
    } finally {
      setExportingCsv(false);
    }
  }

  const filtered = useMemo(
    () =>
      projects.filter(
        (project) =>
          project.name?.toLowerCase().includes(search.toLowerCase()) ||
          (project.ownerId || '').toLowerCase().includes(search.toLowerCase())
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
            <main className="flex-1">
              <div className="shell-panel mb-4 rounded-[1.9rem] p-5">
              <div className="mb-5 flex items-center justify-between gap-4">
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
                    <div className="flex items-center gap-2">
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
                      <button className="btn" disabled={!newName.trim()} onClick={create}>
                        Create
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

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {loading ? (
                  <div className="text-slate-500">Loading...</div>
                ) : filtered.length ? (
                  filtered.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onOpen={onOpen}
                      onViewSubmissions={(target) => setSubmissionProjectId(target.id)}
                      onDelete={(target) => {
                        if (window.confirm(`Delete project "${target.name}"? This cannot be undone.`)) {
                          void remove(target.id);
                        }
                      }}
                    />
                  ))
                ) : (
                  <div className="text-slate-500">No projects found</div>
                )}
              </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {submissionProjectId ? (
        <SubmissionDrawer
          project={submissionProject}
          loadingProject={loadingSubmissionProject}
          projectError={submissionProjectError}
          selectedBlockId={selectedSubmissionBlockId}
          submissions={submissionList}
          sources={appDataSources}
          loadingSubmissions={loadingSubmissions}
          submissionsError={submissionListError}
          exportingCsv={exportingCsv}
          onClose={() => setSubmissionProjectId(null)}
          onSelectBlock={setSelectedSubmissionBlockId}
          onExportCsv={exportSelectedCsv}
        />
      ) : null}
    </div>
  );
}
