import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { Project } from '../../shared/schema/types';
import { createProject, getProject, getToken, listProjects, updateProject } from '../../api';
import { isDemoProject } from '../../demo/demoProject';
import { isObjectIdLike, normalizeProject, rememberProjectId } from './projectUtils';

type UseProjectPersistenceOptions = {
  project: Project;
  setProject: Dispatch<SetStateAction<Project>>;
  resetProject: (project: Project) => void;
  setSelectedPageId: (id: string) => void;
  setAuthed: (authed: boolean) => void;
};

export function useProjectPersistence({
  project,
  setProject,
  resetProject,
  setSelectedPageId,
  setAuthed,
}: UseProjectPersistenceOptions) {
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const autosaveTimer = useRef<number | null>(null);
  const isFirstMount = useRef<boolean>(true);

  function applyLoadedProject(full: any, options: { remember?: boolean } = {}) {
    const normalized = normalizeProject(full);
    resetProject(normalized);
    setSelectedPageId(normalized.pages[0]?.id ?? '');
    setSaveError(null);
    setLastSavedAt(null);
    if (options.remember !== false) rememberProjectId(normalized.id);
    return normalized;
  }

  async function openProject(projectSummary: any, navigate?: (path: string) => void) {
    let full = projectSummary;
    if (!full.pages) {
      full = await getProject(projectSummary.id);
    }
    const normalized = applyLoadedProject(full);

    if (navigate) {
      navigate(isObjectIdLike(normalized.id) ? `/editor/${normalized.id}` : '/editor');
    }
  }

  async function loadProjectById(projectId: string) {
    const full = await getProject(projectId);
    return applyLoadedProject(full);
  }

  function openLocalProject(localProject: Project) {
    return applyLoadedProject(localProject, { remember: false });
  }

  async function saveProject() {
    if (isDemoProject(project)) {
      setSaveError('Demo changes are temporary and cannot be saved.');
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      if (!isObjectIdLike(project.id)) {
        const created: any = await createProject(project);
        setProject(created);
        rememberProjectId(created?.id);
        setLastSavedAt(Date.now());
        return;
      }
      await updateProject(project.id, project);
      rememberProjectId(project.id);
      setLastSavedAt(Date.now());
    } catch (error: any) {
      if (error?.status === 403) {
        try { localStorage.removeItem('app_token'); } catch {}
        setAuthed(false);
        return;
      }
      setSaveError(error?.message ?? 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }

  async function apiSaveProjectSilent(projectToSave: Project) {
    if (!getToken()) throw new Error('Not authenticated');
    if (!isObjectIdLike(projectToSave.id)) {
      const created: any = await createProject(projectToSave);
      rememberProjectId(created?.id);
      return created;
    }
    await updateProject(projectToSave.id, projectToSave);
    rememberProjectId(projectToSave.id);
    return projectToSave;
  }

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (!getToken()) return;
    if (isDemoProject(project)) {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      return;
    }
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(async () => {
      setIsSaving(true);
      try {
        const result = await apiSaveProjectSilent(project);
        if (result && result.id && result.id !== project.id) setProject(result);
        setLastSavedAt(Date.now());
        setSaveError(null);
      } catch (error: any) {
        setSaveError(error?.message ?? 'Autosave failed');
      } finally {
        setIsSaving(false);
      }
    }, 1500);

    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [project]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!getToken()) return;
      try {
        await listProjects();
        if (mounted) setAuthed(true);
      } catch (error: any) {
        if ((error.message && error.message.toLowerCase().includes('unauthorized')) || error.message === 'Unauthorized') {
          try { localStorage.removeItem('app_token'); } catch {}
        }
        if (mounted) setAuthed(false);
      }
    })();
    return () => { mounted = false; };
  }, [setAuthed]);

  return {
    openProject,
    openLocalProject,
    loadProjectById,
    saveProject,
    isSaving,
    lastSavedAt,
    saveError,
    setSaveError,
  };
}
