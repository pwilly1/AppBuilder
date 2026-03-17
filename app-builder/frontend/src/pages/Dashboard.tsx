import { useEffect, useMemo, useState } from 'react';
import {
  createProject,
  deleteProject,
  getProject,
  listProjectFormSubmissions,
  listProjects,
  type ProjectFormSubmission,
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

type ContactFormRef = {
  id: string;
  title: string;
  pageTitle: string;
  destinationEmail?: string;
};

function TopNav({ search, setSearch }: { search: string; setSearch: (s: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="max-w-xl flex-1">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects or owners..."
          className="field-input !rounded-full"
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
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.key} className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-slate-700 transition-colors hover:bg-white/70">
            <div className="text-slate-500">{it.icon}</div>
            <div className="text-sm font-medium">{it.label}</div>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function collectContactForms(project: ProjectRecord | null): ContactFormRef[] {
  if (!project?.pages?.length) return [];
  return project.pages.flatMap((page) =>
    (page.blocks || [])
      .filter((block) => block.type === 'contactForm')
      .map((block, index) => ({
        id: block.id,
        title: typeof block.props?.title === 'string' && block.props.title.trim() ? block.props.title : `Contact Form ${index + 1}`,
        pageTitle: page.title || 'Untitled Page',
        destinationEmail:
          typeof block.props?.destinationEmail === 'string' && block.props.destinationEmail.trim()
            ? block.props.destinationEmail.trim()
            : undefined,
      }))
  );
}

function formatSubmissionValue(value?: string) {
  return value && value.trim() ? value : '-';
}

function SubmissionDrawer({
  project,
  loadingProject,
  projectError,
  selectedBlockId,
  submissions,
  loadingSubmissions,
  submissionsError,
  onClose,
  onSelectBlock,
}: {
  project: ProjectRecord | null;
  loadingProject: boolean;
  projectError: string;
  selectedBlockId: string;
  submissions: ProjectFormSubmission[];
  loadingSubmissions: boolean;
  submissionsError: string;
  onClose: () => void;
  onSelectBlock: (blockId: string) => void;
}) {
  const forms = collectContactForms(project);
  const selectedForm = forms.find((form) => form.id === selectedBlockId) || forms[0];
  const sortedSubmissions = [...submissions].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
      <div className="mx-auto flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Submissions</h3>
            <p className="mt-1 text-sm text-slate-500">
              {project ? `Project: ${project.name}` : 'Loading project details'}
            </p>
          </div>
          <button className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="grid flex-1 gap-0 overflow-hidden md:grid-cols-[280px_1fr]">
          <aside className="border-b border-slate-200 bg-slate-50 p-5 md:border-b-0 md:border-r">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Contact Forms</h4>
            {loadingProject ? <p className="mt-4 text-sm text-slate-500">Loading forms...</p> : null}
            {!loadingProject && projectError ? <p className="mt-4 text-sm text-red-600">{projectError}</p> : null}
            {!loadingProject && !projectError && forms.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">This project does not have any contact forms yet.</p>
            ) : null}
            <div className="mt-4 space-y-3">
              {forms.map((form) => (
                <button
                  key={form.id}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                    form.id === selectedForm?.id
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300'
                  }`}
                  onClick={() => onSelectBlock(form.id)}
                >
                  <div className="text-sm font-semibold">{form.title}</div>
                  <div className={`mt-1 text-xs ${form.id === selectedForm?.id ? 'text-slate-300' : 'text-slate-500'}`}>
                    {form.pageTitle}
                  </div>
                  <div className={`mt-2 text-xs ${form.id === selectedForm?.id ? 'text-slate-300' : 'text-slate-500'}`}>
                    {form.destinationEmail ? `Emails: ${form.destinationEmail}` : 'Email notifications not configured'}
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <section className="flex min-h-0 flex-col p-6">
            {selectedForm ? (
              <>
                <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">{selectedForm.title}</div>
                    <div className="mt-1 text-sm text-slate-500">{selectedForm.pageTitle}</div>
                  </div>
                  <div className="text-right text-sm text-slate-500">
                    <div>{sortedSubmissions.length} submissions</div>
                    <div>{selectedForm.destinationEmail || 'No destination email set'}</div>
                  </div>
                </div>

                <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
                  {loadingSubmissions ? <p className="text-sm text-slate-500">Loading submissions...</p> : null}
                  {!loadingSubmissions && submissionsError ? <p className="text-sm text-red-600">{submissionsError}</p> : null}
                  {!loadingSubmissions && !submissionsError && sortedSubmissions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                      No submissions yet for this form.
                    </div>
                  ) : null}
                  <div className="space-y-4">
                    {sortedSubmissions.map((submission) => (
                      <article key={submission.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h5 className="text-sm font-semibold text-slate-900">
                              {formatSubmissionValue(submission.data.name)}
                            </h5>
                            <p className="mt-1 text-xs text-slate-500">
                              {new Date(submission.submittedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</dt>
                            <dd className="mt-1 text-sm text-slate-900">{formatSubmissionValue(submission.data.email)}</dd>
                          </div>
                          <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Phone</dt>
                            <dd className="mt-1 text-sm text-slate-900">{formatSubmissionValue(submission.data.phone)}</dd>
                          </div>
                          <div className="sm:col-span-2">
                            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Message</dt>
                            <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-900">
                              {formatSubmissionValue(submission.data.message)}
                            </dd>
                          </div>
                        </dl>
                      </article>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                Select a project with a contact form to review submissions.
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
    <div className="group shell-panel rounded-[1.75rem] p-4 transition-transform duration-200 hover:-translate-y-1">
      <div className="overflow-hidden rounded-[1.2rem] bg-white shadow-sm" style={{ height: 160 }}>
        <div className="h-full w-full bg-gradient-to-b from-white to-slate-50 p-3">
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
          <div className="rounded-full bg-[rgba(37,99,235,0.12)] px-3 py-1 text-xs font-semibold text-[var(--accent-deep)]">
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
  const [newName, setNewName] = useState('');
  const [search, setSearch] = useState('');

  const [submissionProjectId, setSubmissionProjectId] = useState<string | null>(null);
  const [submissionProject, setSubmissionProject] = useState<ProjectRecord | null>(null);
  const [selectedSubmissionBlockId, setSelectedSubmissionBlockId] = useState('');
  const [submissionList, setSubmissionList] = useState<ProjectFormSubmission[]>([]);
  const [loadingSubmissionProject, setLoadingSubmissionProject] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
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
        const res: any = await getProject(projectId);
        if (cancelled) return;
        const normalized: ProjectRecord = { ...res, id: res.id ?? res._id };
        const forms = collectContactForms(normalized);
        setSubmissionProject(normalized);
        setSelectedSubmissionBlockId((current) => {
          if (current && forms.some((form) => form.id === current)) return current;
          return forms[0]?.id || '';
        });
      } catch (error: any) {
        if (cancelled) return;
        setSubmissionProject(null);
        setSelectedSubmissionBlockId('');
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
        const res = await listProjectFormSubmissions(projectId, blockId);
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
    try {
      const res: any = await createProject(newName || 'Untitled');
      const normalized = { ...res, id: res.id ?? res._id };
      setProjects((prev) => [normalized, ...prev]);
      setNewName('');
      onOpen(normalized);
    } catch (error) {
      console.error(error);
    }
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
      <div className="mx-auto max-w-[var(--max-width)] px-4 py-6">
        <TopNav search={search} setSearch={setSearch} />
        <div className="mt-2 rounded-lg bg-transparent shadow-none">
          <div className="flex gap-4">
            <Sidebar />
            <main className="flex-1">
              <div className="shell-panel mb-4 rounded-[1.75rem] p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Workspace</div>
                  <h2 className="section-heading text-3xl font-semibold">Projects</h2>
                  <p className="muted">A snapshot of your work. Open a project to edit it or review contact submissions.</p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    className="field-input !min-w-[220px] !rounded-full !px-4 !py-3"
                    placeholder="New project name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                  <button className="btn" onClick={create}>Create</button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
          loadingSubmissions={loadingSubmissions}
          submissionsError={submissionListError}
          onClose={() => setSubmissionProjectId(null)}
          onSelectBlock={setSelectedSubmissionBlockId}
        />
      ) : null}
    </div>
  );
}

