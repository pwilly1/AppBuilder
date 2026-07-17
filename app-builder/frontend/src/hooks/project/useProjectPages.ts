import { useState } from 'react';
import type { Project } from '../../shared/schema/types';
import { slugify, uniquePath } from './projectUtils';
import { normalizePageBackgroundColor } from '../../shared/schema/pageAppearance';

type UseProjectPagesOptions = {
  project: Project;
  applyChange: (mutator: (project: Project) => Project) => void;
};

export function useProjectPages({ project, applyChange }: UseProjectPagesOptions) {
  const [selectedPageId, setSelectedPageId] = useState<string>(() => project.pages?.[0]?.id ?? '');
  const page = project.pages.find((candidate) => candidate.id === selectedPageId);

  function selectPage(id: string) {
    setSelectedPageId(id);
  }

  function addPage(title?: string) {
    const id = crypto.randomUUID();
    applyChange((currentProject) => {
      const nextIndex = currentProject.pages.length + 1;
      const pageTitle = (title && title.trim()) || `Page ${nextIndex}`;
      const path = uniquePath(slugify(pageTitle), currentProject.pages);
      const newPage = { id, title: pageTitle, path, appearance: { backgroundColor: '#ffffff' }, blocks: [] };
      return { ...currentProject, pages: [...currentProject.pages, newPage] };
    });
    setSelectedPageId(id);
  }

  function renamePage(id: string, title: string, autoUpdatePath = true) {
    applyChange((currentProject) => {
      const newTitle = title?.trim() || 'Untitled';
      const newPages = currentProject.pages.map((candidate) => {
        if (candidate.id !== id) return candidate;
        const nextPage = { ...candidate, title: newTitle };
        if (autoUpdatePath) {
          const proposed = slugify(newTitle) || 'page';
          nextPage.path = uniquePath(proposed, currentProject.pages, id);
        }
        return nextPage;
      });
      return { ...currentProject, pages: newPages };
    });
  }

  function deletePage(id: string) {
    let nextSelectedPageId: string | null = null;
    applyChange((currentProject) => {
      if (currentProject.pages.length <= 1) return currentProject;
      const index = currentProject.pages.findIndex((candidate) => candidate.id === id);
      const remaining = currentProject.pages.filter((candidate) => candidate.id !== id);
      const pickIndex = Math.min(index, Math.max(0, remaining.length - 1));
      nextSelectedPageId = remaining[pickIndex]?.id ?? remaining[0]?.id ?? null;
      return { ...currentProject, pages: remaining };
    });
    if (nextSelectedPageId) setSelectedPageId(nextSelectedPageId);
  }

  function setPageBackgroundColor(id: string, backgroundColor: string) {
    const normalizedColor = normalizePageBackgroundColor(backgroundColor);
    applyChange((currentProject) => ({
      ...currentProject,
      pages: currentProject.pages.map((candidate) => (
        candidate.id === id
          ? {
              ...candidate,
              appearance: {
                ...(candidate.appearance || {}),
                backgroundColor: normalizedColor,
              },
            }
          : candidate
      )),
    }));
  }

  return {
    selectedPageId,
    setSelectedPageId,
    page,
    selectPage,
    addPage,
    renamePage,
    deletePage,
    setPageBackgroundColor,
  };
}
