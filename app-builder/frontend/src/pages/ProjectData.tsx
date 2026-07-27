import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleStackIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  TableCellsIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  exportProjectAppDataCsv,
  getProject,
  listProjectAppDataRecordPage,
  listProjectAppDataSources,
  updateProject,
  type ProjectAppDataRecord,
  type ProjectAppDataSubmitter,
  type ProjectAppDataSource,
} from '../api';
import DataCollectionsPanel from '../components/DataCollectionsPanel';
import type { AppDataCollection, Project } from '../shared/schema/types';

type ProjectResponse = Project & {
  _id?: string;
};

type DataWorkspaceTab = 'collections' | 'records';
type CollectionSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const RECORD_PAGE_SIZE = 50;

const SOURCE_TYPE_LABELS: Record<ProjectAppDataSource['type'], string> = {
  collection: 'Collection',
  button: 'Submit button',
  form: 'Legacy form',
  contactForm: 'Contact form',
};

function formatRecordValue(value?: string | boolean) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return value && value.trim() ? value : '-';
}

function formatFieldKey(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getFieldLabel(key: string, source?: ProjectAppDataSource) {
  return source?.fields.find((field) => field.key === key)?.label || formatFieldKey(key);
}

function getVisibleEntries(data: ProjectAppDataRecord['data']) {
  return Object.entries(data).filter((entry): entry is [string, string | boolean] => {
    const value = entry[1];
    return typeof value === 'boolean' || (typeof value === 'string' && value.trim().length > 0);
  });
}

function getOrderedEntries(record: ProjectAppDataRecord, source?: ProjectAppDataSource) {
  const fieldOrder = new Map(source?.fields.map((field, index) => [field.key, index]) || []);
  return getVisibleEntries(record.data).sort(([leftKey], [rightKey]) => {
    const leftIndex = fieldOrder.get(leftKey) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = fieldOrder.get(rightKey) ?? Number.MAX_SAFE_INTEGER;
    return leftIndex - rightIndex || leftKey.localeCompare(rightKey);
  });
}

function getRecordSummary(data: ProjectAppDataRecord['data']) {
  for (const key of ['name', 'fullName', 'email', 'title']) {
    const value = data[key];
    if (typeof value === 'string' && value.trim()) return value;
  }

  const firstTextValue = Object.values(data).find(
    (value): value is string => typeof value === 'string' && value.trim().length > 0
  );
  return firstTextValue || 'Submission';
}

function getSubmitterLabel(submitter?: ProjectAppDataSubmitter) {
  if (!submitter) return 'Unknown submitter';
  if (submitter.type === 'anonymous') return 'Anonymous submission';
  if (submitter.type === 'deleted') return 'Deleted user';
  return submitter.displayName.trim() || submitter.email;
}

function getSubmitterDescription(submitter?: ProjectAppDataSubmitter) {
  if (!submitter) return 'Submitter information is unavailable.';
  if (submitter.type === 'anonymous') return 'No app account was attached to this record.';
  if (submitter.type === 'deleted') return 'The app account that created this record no longer exists.';
  return submitter.displayName.trim() ? submitter.email : 'Authenticated app user';
}

function getSubmitterSearchValues(submitter?: ProjectAppDataSubmitter) {
  if (!submitter) return ['unknown submitter'];
  if (submitter.type === 'anonymous') return ['anonymous submission'];
  if (submitter.type === 'deleted') return ['deleted user'];
  return [submitter.displayName, submitter.email];
}

function recordMatchesSearch(
  record: ProjectAppDataRecord,
  source: ProjectAppDataSource | undefined,
  search: string
) {
  const query = search.trim().toLowerCase();
  if (!query) return true;

  const searchable = [
    getRecordSummary(record.data),
    new Date(record.submittedAt).toLocaleString(),
    ...getSubmitterSearchValues(record.submittedBy),
    ...Object.entries(record.data).flatMap(([key, value]) => [
      key,
      getFieldLabel(key, source),
      typeof value === 'boolean' ? (value ? 'yes' : 'no') : value || '',
    ]),
  ];

  return searchable.some((value) => String(value).toLowerCase().includes(query));
}

function slugifyFilePart(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'app-data'
  );
}

function CollectionsWorkspace({
  collections,
  saveStatus,
  saveError,
  onChange,
  onOpenEditor,
  onRetry,
}: {
  collections: AppDataCollection[];
  saveStatus: CollectionSaveStatus;
  saveError: string;
  onChange: (collections: AppDataCollection[]) => void;
  onOpenEditor: () => void;
  onRetry: () => void;
}) {
  const fieldCount = collections.reduce((total, collection) => total + collection.fields.length, 0);

  return (
    <div className="grid min-h-[650px] lg:grid-cols-[minmax(0,620px)_minmax(320px,1fr)]">
      <section className="border-b border-slate-200/80 bg-[#fffbf5]/70 p-5 lg:border-b-0 lg:border-r lg:p-6">
        <DataCollectionsPanel collections={collections} onChange={onChange} />
      </section>

      <aside className="bg-white/65 p-6 lg:p-8">
        <div className="max-w-xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">Project schema</div>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">Shape the data your app can store</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Collections define reusable records such as customers, tasks, inspections, or announcements. Blocks can submit values into these fields and display them later.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-[#fffbf5] p-4">
              <div className="text-2xl font-semibold text-slate-950">{collections.length}</div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {collections.length === 1 ? 'Collection' : 'Collections'}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-[#fffbf5] p-4">
              <div className="text-2xl font-semibold text-slate-950">{fieldCount}</div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {fieldCount === 1 ? 'Field' : 'Fields'}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
            <h4 className="text-sm font-semibold text-slate-900">How this connects to the editor</h4>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              Create the collection here, then configure Text, Hero, or Button blocks in the editor to read or write its fields.
            </p>
            <button type="button" className="btn-sm mt-4" onClick={onOpenEditor}>Open editor</button>
          </div>

          <div className="mt-5 min-h-6 text-xs" aria-live="polite">
            {saveStatus === 'saving' ? <span className="font-semibold text-blue-700">Saving collection changes...</span> : null}
            {saveStatus === 'saved' ? <span className="font-semibold text-emerald-700">All collection changes saved.</span> : null}
            {saveStatus === 'error' ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
                <p>{saveError}</p>
                <button type="button" className="mt-2 font-semibold underline" onClick={onRetry}>Try again</button>
              </div>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function ProjectData() {
  const navigate = useNavigate();
  const { projectId = '' } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [project, setProject] = useState<Project | null>(null);
  const [sources, setSources] = useState<ProjectAppDataSource[]>([]);
  const [records, setRecords] = useState<ProjectAppDataRecord[]>([]);
  const [recordCursor, setRecordCursor] = useState<string | null>(null);
  const [recordCursorHistory, setRecordCursorHistory] = useState<Array<string | null>>([]);
  const [recordPageInfo, setRecordPageInfo] = useState({
    limit: RECORD_PAGE_SIZE,
    total: 0,
    hasMore: false,
    nextCursor: null as string | null,
  });
  const [recordSearch, setRecordSearch] = useState('');
  const [loadingProject, setLoadingProject] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [projectError, setProjectError] = useState('');
  const [recordsError, setRecordsError] = useState('');
  const [exportError, setExportError] = useState('');
  const [collectionSaveStatus, setCollectionSaveStatus] = useState<CollectionSaveStatus>('idle');
  const [collectionSaveError, setCollectionSaveError] = useState('');
  const [projectLoadAttempt, setProjectLoadAttempt] = useState(0);
  const [recordLoadAttempt, setRecordLoadAttempt] = useState(0);
  const collectionSaveQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const collectionSaveRevisionRef = useRef(0);

  const activeTab: DataWorkspaceTab = searchParams.get('tab') === 'collections' ? 'collections' : 'records';
  const sourceParam = searchParams.get('source') || '';
  const recordParam = searchParams.get('record') || '';
  const selectedSource = useMemo(
    () => sources.find((source) => source.sourceId === sourceParam) || sources[0],
    [sourceParam, sources]
  );
  const selectedSourceId = selectedSource?.sourceId || '';

  useEffect(() => {
    if (!projectId) {
      setLoadingProject(false);
      setProjectError('No project was selected.');
      return;
    }

    let cancelled = false;
    setLoadingProject(true);
    setProjectError('');

    async function loadProjectData() {
      try {
        const [projectResponse, sourceResponse] = await Promise.all([
          getProject(projectId) as Promise<ProjectResponse>,
          listProjectAppDataSources(projectId),
        ]);
        if (cancelled) return;

        setProject({
          ...projectResponse,
          id: projectResponse.id || projectResponse._id || projectId,
          name: projectResponse.name || 'Untitled project',
          pages: projectResponse.pages || [],
          dataCollections: projectResponse.dataCollections || [],
        });
        setSources(sourceResponse || []);
      } catch (error) {
        if (cancelled) return;
        setProject(null);
        setSources([]);
        setProjectError(error instanceof Error ? error.message : 'Failed to load app data.');
      } finally {
        if (!cancelled) setLoadingProject(false);
      }
    }

    void loadProjectData();
    return () => {
      cancelled = true;
    };
  }, [projectId, projectLoadAttempt]);

  useEffect(() => {
    if (activeTab !== 'records') return;
    if (!selectedSource || sourceParam === selectedSource.sourceId) return;

    const next = new URLSearchParams(searchParams);
    next.set('source', selectedSource.sourceId);
    next.delete('record');
    setSearchParams(next, { replace: true });
  }, [activeTab, searchParams, selectedSource, setSearchParams, sourceParam]);

  useEffect(() => {
    setRecordCursor(null);
    setRecordCursorHistory([]);
    setRecordSearch('');
  }, [selectedSourceId]);

  useEffect(() => {
    if (activeTab !== 'records' || !projectId || !selectedSourceId) {
      setRecords([]);
      setRecordPageInfo({
        limit: RECORD_PAGE_SIZE,
        total: 0,
        hasMore: false,
        nextCursor: null,
      });
      setRecordsError('');
      setLoadingRecords(false);
      return;
    }

    let cancelled = false;
    setRecords([]);
    setLoadingRecords(true);
    setRecordsError('');
    setExportError('');

    async function loadRecords() {
      try {
        const response = await listProjectAppDataRecordPage(projectId, selectedSourceId, {
          limit: RECORD_PAGE_SIZE,
          cursor: recordCursor,
        });
        if (!cancelled) {
          setRecords(response.records || []);
          setRecordPageInfo(response.pageInfo);
        }
      } catch (error) {
        if (cancelled) return;
        setRecords([]);
        setRecordPageInfo({
          limit: RECORD_PAGE_SIZE,
          total: 0,
          hasMore: false,
          nextCursor: null,
        });
        setRecordsError(error instanceof Error ? error.message : 'Failed to load submissions.');
      } finally {
        if (!cancelled) setLoadingRecords(false);
      }
    }

    void loadRecords();
    return () => {
      cancelled = true;
    };
  }, [activeTab, projectId, recordCursor, recordLoadAttempt, selectedSourceId]);

  const sortedRecords = useMemo(
    () => [...records].sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime()),
    [records]
  );
  const filteredRecords = useMemo(
    () => sortedRecords.filter((record) => recordMatchesSearch(record, selectedSource, recordSearch)),
    [recordSearch, selectedSource, sortedRecords]
  );
  const selectedRecord = useMemo(
    () => filteredRecords.find((record) => record.id === recordParam) || filteredRecords[0] || null,
    [filteredRecords, recordParam]
  );
  const selectedRecordEntries = useMemo(
    () => (selectedRecord ? getOrderedEntries(selectedRecord, selectedSource) : []),
    [selectedRecord, selectedSource]
  );
  const totalRecords = useMemo(
    () => sources.reduce((total, source) => total + source.recordCount, 0),
    [sources]
  );
  const recordPageNumber = recordCursorHistory.length + 1;

  function selectSource(sourceId: string) {
    const next = new URLSearchParams(searchParams);
    next.set('source', sourceId);
    next.delete('record');
    setRecords([]);
    setRecordCursor(null);
    setRecordCursorHistory([]);
    setLoadingRecords(true);
    setRecordsError('');
    setSearchParams(next);
    setRecordSearch('');
  }

  function changeRecordPage(
    cursor: string | null,
    history: Array<string | null>,
  ) {
    setRecordCursor(cursor);
    setRecordCursorHistory(history);
    setRecordSearch('');
    setRecords([]);
    setLoadingRecords(true);
    setRecordsError('');

    const next = new URLSearchParams(searchParams);
    next.delete('record');
    setSearchParams(next, { replace: true });
  }

  function showNextRecordPage() {
    if (!recordPageInfo.hasMore || !recordPageInfo.nextCursor) return;
    changeRecordPage(
      recordPageInfo.nextCursor,
      [...recordCursorHistory, recordCursor],
    );
  }

  function showPreviousRecordPage() {
    if (recordCursorHistory.length === 0) return;
    const previousHistory = recordCursorHistory.slice(0, -1);
    changeRecordPage(
      recordCursorHistory[recordCursorHistory.length - 1] ?? null,
      previousHistory,
    );
  }

  function selectTab(tab: DataWorkspaceTab) {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    if (tab === 'collections') {
      next.delete('source');
      next.delete('record');
    }
    setSearchParams(next);
  }

  function updateCollections(dataCollections: AppDataCollection[]) {
    if (!projectId || !project) return;

    setProject((current) => current ? { ...current, dataCollections } : current);
    setCollectionSaveStatus('saving');
    setCollectionSaveError('');
    const revision = ++collectionSaveRevisionRef.current;

    const save = collectionSaveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        await updateProject(projectId, { dataCollections });
        return listProjectAppDataSources(projectId);
      });

    collectionSaveQueueRef.current = save.then(
      (nextSources) => {
        if (revision !== collectionSaveRevisionRef.current) return;
        setSources(nextSources || []);
        setCollectionSaveStatus('saved');
      },
      (error: unknown) => {
        if (revision !== collectionSaveRevisionRef.current) return;
        setCollectionSaveStatus('error');
        setCollectionSaveError(error instanceof Error ? error.message : 'Failed to save collection changes.');
      },
    );
  }

  function selectRecord(recordId: string) {
    const next = new URLSearchParams(searchParams);
    next.set('record', recordId);
    setSearchParams(next);
  }

  function updateRecordSearch(value: string) {
    setRecordSearch(value);
    const matchingRecords = sortedRecords.filter((record) => recordMatchesSearch(record, selectedSource, value));
    const currentRecordStillVisible = matchingRecords.some((record) => record.id === recordParam);
    if (currentRecordStillVisible) return;

    const next = new URLSearchParams(searchParams);
    const nextRecordId = matchingRecords[0]?.id;
    if (nextRecordId) next.set('record', nextRecordId);
    else next.delete('record');
    setSearchParams(next, { replace: true });
  }

  async function exportCsv() {
    if (!selectedSource) return;

    setExportingCsv(true);
    setExportError('');
    try {
      const csv = await exportProjectAppDataCsv(projectId, selectedSource.sourceId);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${slugifyFilePart(project?.name || 'project')}-${slugifyFilePart(selectedSource.name)}-records.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Failed to export CSV.');
    } finally {
      setExportingCsv(false);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6">
        <button
          type="button"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-100 transition hover:text-white"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to projects
        </button>

        <header className="mt-4 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100/70">Project data</div>
            <h2 className="section-heading mt-1 text-4xl font-semibold text-white">Data</h2>
            <p className="mt-2 text-sm text-blue-100/70">
              {project ? `Design and review the data used by ${project.name}.` : 'Design and review this project data.'}
            </p>
          </div>
          {!loadingProject && !projectError ? (
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full border border-blue-200/15 bg-white/8 px-4 py-2 text-blue-50">
                {project?.dataCollections?.length || 0} {(project?.dataCollections?.length || 0) === 1 ? 'collection' : 'collections'}
              </span>
              <span className="rounded-full border border-blue-200/15 bg-white/8 px-4 py-2 text-blue-50">
                {totalRecords} {totalRecords === 1 ? 'record' : 'records'}
              </span>
              <button
                type="button"
                className="rounded-full border border-blue-200/20 bg-white/10 px-4 py-2 font-semibold text-white transition hover:bg-white/15"
                onClick={() => navigate(`/editor/${projectId}`)}
              >
                Open editor
              </button>
            </div>
          ) : null}
        </header>

        <nav className="mt-6 inline-flex rounded-2xl border border-white/10 bg-white/8 p-1.5" aria-label="Project data sections">
          <button
            type="button"
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === 'collections' ? 'bg-[#fffbf5] text-blue-800 shadow-sm' : 'text-blue-100 hover:bg-white/10 hover:text-white'
            }`}
            onClick={() => selectTab('collections')}
            aria-current={activeTab === 'collections' ? 'page' : undefined}
          >
            <CircleStackIcon className="h-4 w-4" />
            Collections
          </button>
          <button
            type="button"
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === 'records' ? 'bg-[#fffbf5] text-blue-800 shadow-sm' : 'text-blue-100 hover:bg-white/10 hover:text-white'
            }`}
            onClick={() => selectTab('records')}
            aria-current={activeTab === 'records' ? 'page' : undefined}
          >
            <TableCellsIcon className="h-4 w-4" />
            Records
          </button>
        </nav>

        <div className="shell-panel mt-4 overflow-hidden rounded-[1.9rem]">
          {loadingProject ? (
            <div className="flex min-h-[420px] items-center justify-center p-8 text-sm text-slate-500" aria-live="polite">
              Loading project data...
            </div>
          ) : projectError ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
              <CircleStackIcon className="h-10 w-10 text-slate-400" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Project data could not be loaded</h3>
              <p className="mt-2 max-w-md text-sm text-slate-500">{projectError}</p>
              <button type="button" className="btn mt-5" onClick={() => setProjectLoadAttempt((attempt) => attempt + 1)}>
                Try again
              </button>
            </div>
          ) : activeTab === 'collections' && project ? (
            <CollectionsWorkspace
              collections={project.dataCollections || []}
              saveStatus={collectionSaveStatus}
              saveError={collectionSaveError}
              onChange={updateCollections}
              onOpenEditor={() => navigate(`/editor/${projectId}`)}
              onRetry={() => updateCollections(project.dataCollections || [])}
            />
          ) : sources.length === 0 ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
              <CircleStackIcon className="h-10 w-10 text-slate-400" />
              <h3 className="mt-4 text-lg font-semibold text-slate-900">No data sources yet</h3>
              <p className="mt-2 max-w-lg text-sm text-slate-500">
                Create a collection or configure a Submit Data button. Records will appear here after the app receives data.
              </p>
              <button type="button" className="btn mt-5" onClick={() => selectTab('collections')}>
                Create a collection
              </button>
            </div>
          ) : (
            <div className="grid min-h-[650px] lg:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="border-b border-slate-200/80 bg-[#f7f1e6]/65 p-5 lg:border-b-0 lg:border-r">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Navigate</div>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">Data sources</h3>
                  </div>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{sources.length}</span>
                </div>

                <nav className="mt-5 space-y-2" aria-label="Project data sources">
                  {sources.map((source) => {
                    const active = source.sourceId === selectedSource?.sourceId;
                    return (
                      <button
                        key={source.sourceId}
                        type="button"
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                          active
                            ? 'border-blue-600 bg-blue-600 text-white shadow-[0_12px_28px_rgba(37,99,235,0.2)]'
                            : 'border-slate-200/80 bg-[#fffbf5]/85 text-slate-900 hover:border-blue-200 hover:bg-white'
                        }`}
                        onClick={() => selectSource(source.sourceId)}
                        aria-current={active ? 'page' : undefined}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{source.name}</div>
                            <div className={`mt-1 truncate text-xs ${active ? 'text-blue-100' : 'text-slate-500'}`}>
                              {source.pageTitle || 'Project collection'}
                            </div>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            {source.recordCount}
                          </span>
                        </div>
                        <div className={`mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] ${active ? 'text-blue-100' : 'text-slate-400'}`}>
                          {SOURCE_TYPE_LABELS[source.type]}
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </aside>

              <div className="grid min-w-0 xl:grid-cols-[340px_minmax(0,1fr)]">
                <section className="border-b border-slate-200/80 bg-[#fffbf5]/70 p-5 xl:border-b-0 xl:border-r">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Submissions</div>
                      <h3 className="mt-1 truncate text-lg font-semibold text-slate-900">{selectedSource?.name}</h3>
                    </div>
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-blue-700 disabled:opacity-50"
                      onClick={() => setRecordLoadAttempt((attempt) => attempt + 1)}
                      disabled={loadingRecords}
                      aria-label="Refresh submissions"
                      title="Refresh submissions"
                    >
                      <ArrowPathIcon className={`h-4 w-4 ${loadingRecords ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  <label className="relative mt-4 block">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      className="field-input !rounded-full !py-2.5 !pl-9"
                      value={recordSearch}
                      onChange={(event) => updateRecordSearch(event.target.value)}
                      placeholder="Search this page..."
                      aria-label="Search submissions on this page"
                    />
                  </label>

                  <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span>
                      {recordSearch
                        ? `${filteredRecords.length} matching on this page`
                        : `${records.length} on page ${recordPageNumber}`}
                      {' · '}
                      {recordPageInfo.total} total
                    </span>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 font-semibold text-blue-700 transition hover:text-blue-900 disabled:cursor-not-allowed disabled:text-slate-400"
                      onClick={() => void exportCsv()}
                      disabled={exportingCsv || records.length === 0}
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      {exportingCsv ? 'Exporting...' : 'Export CSV'}
                    </button>
                  </div>

                  {exportError ? <p className="mt-3 text-xs text-red-600">{exportError}</p> : null}
                  {loadingRecords ? <p className="mt-5 text-sm text-slate-500" aria-live="polite">Loading submissions...</p> : null}
                  {!loadingRecords && recordsError ? (
                    <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      <p>{recordsError}</p>
                      <button type="button" className="mt-3 font-semibold underline" onClick={() => setRecordLoadAttempt((attempt) => attempt + 1)}>
                        Try again
                      </button>
                    </div>
                  ) : null}
                  {!loadingRecords && !recordsError && records.length === 0 ? (
                    <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-5 text-sm text-slate-500">
                      No submissions have been received for this source.
                    </div>
                  ) : null}
                  {!loadingRecords && !recordsError && records.length > 0 && filteredRecords.length === 0 ? (
                    <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-5 text-sm text-slate-500">
                      No submissions match your search.
                    </div>
                  ) : null}

                  <div className="mt-4 space-y-2 xl:max-h-[570px] xl:overflow-y-auto xl:pr-1">
                    {filteredRecords.map((record) => {
                      const active = record.id === selectedRecord?.id;
                      const previewEntries = getOrderedEntries(record, selectedSource).slice(0, 2);
                      return (
                        <button
                          key={record.id}
                          type="button"
                          className={`w-full rounded-2xl border p-3 text-left transition ${
                            active
                              ? 'border-blue-300 bg-blue-50 shadow-sm'
                              : 'border-slate-200 bg-white/75 hover:border-blue-200 hover:bg-white'
                          }`}
                          onClick={() => selectRecord(record.id)}
                          aria-current={active ? 'true' : undefined}
                        >
                          <div className="truncate text-sm font-semibold text-slate-900">{getRecordSummary(record.data)}</div>
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-600">
                            <UserCircleIcon className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="truncate">{getSubmitterLabel(record.submittedBy)}</span>
                          </div>
                          <div className="mt-1 text-xs text-slate-400">{new Date(record.submittedAt).toLocaleString()}</div>
                          {previewEntries.length ? (
                            <div className="mt-3 space-y-1">
                              {previewEntries.map(([key, value]) => (
                                <div key={key} className="flex gap-2 text-xs">
                                  <span className="shrink-0 text-slate-400">{getFieldLabel(key, selectedSource)}:</span>
                                  <span className="truncate text-slate-600">{formatRecordValue(value)}</span>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  {!loadingRecords && !recordsError && recordPageInfo.total > 0 ? (
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={showPreviousRecordPage}
                        disabled={recordCursorHistory.length === 0}
                      >
                        <ChevronLeftIcon className="h-4 w-4" />
                        Previous
                      </button>
                      <span className="text-xs font-semibold text-slate-500">
                        Page {recordPageNumber}
                      </span>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={showNextRecordPage}
                        disabled={!recordPageInfo.hasMore || !recordPageInfo.nextCursor}
                      >
                        Next
                        <ChevronRightIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}
                </section>

                <section className="min-w-0 bg-white/65 p-6">
                  {selectedRecord ? (
                    <>
                      <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-start">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">Record details</div>
                          <h3 className="mt-1 text-2xl font-semibold text-slate-950">{getRecordSummary(selectedRecord.data)}</h3>
                          <p className="mt-1 text-sm text-slate-500">{selectedSource?.name || 'App data record'}</p>
                        </div>
                        <span className="self-start rounded-full border border-slate-200 bg-[#fffbf5] px-3 py-1.5 text-xs font-semibold text-slate-600">
                          {selectedRecordEntries.length} {selectedRecordEntries.length === 1 ? 'field' : 'fields'}
                        </span>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                          <div className="flex items-start gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                              <UserCircleIcon className="h-5 w-5" />
                            </span>
                            <div className="min-w-0">
                              <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">Submitted by</div>
                              <div className="mt-1 truncate text-sm font-semibold text-slate-900">
                                {getSubmitterLabel(selectedRecord.submittedBy)}
                              </div>
                              <div className="mt-1 break-words text-xs leading-5 text-slate-500">
                                {getSubmitterDescription(selectedRecord.submittedBy)}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">Record activity</div>
                          <dl className="mt-2 space-y-2 text-xs">
                            <div className="flex items-start justify-between gap-3">
                              <dt className="text-slate-500">Created</dt>
                              <dd className="text-right font-medium text-slate-700">
                                {new Date(selectedRecord.createdAt || selectedRecord.submittedAt).toLocaleString()}
                              </dd>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                              <dt className="text-slate-500">Updated</dt>
                              <dd className="text-right font-medium text-slate-700">
                                {new Date(selectedRecord.updatedAt || selectedRecord.submittedAt).toLocaleString()}
                              </dd>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                              <dt className="text-slate-500">Source</dt>
                              <dd className="text-right font-medium text-slate-700">
                                {selectedSource?.pageTitle || 'Project collection'}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      </div>

                      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
                        <ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                        <p className="leading-6">
                          This view shows values intentionally collected by the project. Apptura account password hashes and session tokens are never included; do not collect passwords or other secrets as app-data fields.
                        </p>
                      </div>

                      {selectedRecordEntries.length ? (
                        <dl className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">
                          {selectedRecordEntries.map(([key, value]) => (
                            <div key={key} className={typeof value === 'string' && value.length > 90 ? 'sm:col-span-2' : ''}>
                              <dt className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                                {getFieldLabel(key, selectedSource)}
                              </dt>
                              <dd className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-900">
                                {formatRecordValue(value)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      ) : (
                        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-[#fffbf5]/70 p-5 text-sm text-slate-500">
                          This submission does not contain any visible values.
                        </div>
                      )}

                      <details className="mt-8 border-t border-slate-200 pt-5">
                        <summary className="cursor-pointer text-xs font-semibold text-slate-500 transition hover:text-slate-800">
                          Technical details
                        </summary>
                        <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">Record ID</div>
                        <div className="mt-2 break-all font-mono text-xs text-slate-500">{selectedRecord.id}</div>
                      </details>
                    </>
                  ) : (
                    <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                      <CircleStackIcon className="h-9 w-9 text-slate-300" />
                      <h3 className="mt-4 text-base font-semibold text-slate-900">Select a submission</h3>
                      <p className="mt-2 max-w-sm text-sm text-slate-500">
                        Choose a record from the list to inspect its submitted fields and values.
                      </p>
                    </div>
                  )}
                </section>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
