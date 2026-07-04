import { useState } from 'react';
import type { Project } from '../../shared/schema/types';
import { cloneProject } from './projectUtils';

const MAX_HISTORY_LENGTH = 100;

export function useProjectHistory(initialProject: Project) {
  const [project, setProject] = useState<Project>(initialProject);
  const [history, setHistory] = useState<Project[]>(() => [cloneProject(initialProject)]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  function resetProject(nextProject: Project) {
    setProject(nextProject);
    setHistory([cloneProject(nextProject)]);
    setHistoryIndex(0);
  }

  function applyChange(mutator: (project: Project) => Project) {
    setProject((current) => {
      const updated = mutator(cloneProject(current));
      setHistory((currentHistory) => {
        const base = currentHistory.slice(0, historyIndex + 1);
        const next = base.concat([cloneProject(updated)]);
        if (next.length > MAX_HISTORY_LENGTH) next.splice(0, next.length - MAX_HISTORY_LENGTH);
        setHistoryIndex(next.length - 1);
        return next;
      });
      return updated;
    });
  }

  function canUndo() {
    return historyIndex > 0;
  }

  function canRedo() {
    return historyIndex < history.length - 1;
  }

  function undo() {
    setHistoryIndex((currentIndex) => {
      if (currentIndex <= 0) return currentIndex;
      const nextIndex = currentIndex - 1;
      const snapshot = history[nextIndex];
      if (snapshot) setProject(cloneProject(snapshot));
      return nextIndex;
    });
  }

  function redo() {
    setHistoryIndex((currentIndex) => {
      if (currentIndex >= history.length - 1) return currentIndex;
      const nextIndex = currentIndex + 1;
      const snapshot = history[nextIndex];
      if (snapshot) setProject(cloneProject(snapshot));
      return nextIndex;
    });
  }

  return {
    project,
    setProject,
    applyChange,
    resetProject,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
