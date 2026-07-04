import type { Page, Project } from '../../shared/schema/types';
import { CURRENT_SCHEMA_VERSION, migrateProjectToGridLayout } from '../../shared/schema/gridMigration';

export const LAST_PROJECT_ID_KEY = 'app_last_project_id';

export function createInitialProject(): Project {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: 'proj1',
    name: 'My App',
    pages: [
      { id: 'home', title: 'Home', path: '/home', blocks: [] },
    ],
  };
}

export function cloneProject(project: Project): Project {
  return JSON.parse(JSON.stringify(project));
}

export function isObjectIdLike(value?: string | null): value is string {
  return typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function uniquePath(base: string, pages: Page[], excludeId?: string): string {
  const baseSlug = base || 'page';
  let candidate = `/${baseSlug}`;
  let n = 2;
  const taken = new Set(pages.filter((page) => page.id !== excludeId).map((page) => page.path));
  while (taken.has(candidate)) {
    candidate = `/${baseSlug}-${n++}`;
  }
  return candidate;
}

export function rememberProjectId(projectId?: string | null) {
  try {
    if (isObjectIdLike(projectId)) {
      localStorage.setItem(LAST_PROJECT_ID_KEY, projectId);
    } else {
      localStorage.removeItem(LAST_PROJECT_ID_KEY);
    }
  } catch {}
}

export function normalizeProject(full: any): Project {
  const next = { ...full };
  if (!next.schemaVersion) next.schemaVersion = 1;
  if (!next.pages || next.pages.length === 0) {
    const id = crypto.randomUUID();
    next.pages = [{ id, title: 'Home', path: '/home', blocks: [] }];
  }
  return migrateProjectToGridLayout(next);
}
