// 2025 Preston Willis. All rights reserved.
import { createInitialProject } from './project/projectUtils';
import { useProjectBlocks } from './project/useProjectBlocks';
import { useProjectHistory } from './project/useProjectHistory';
import { useProjectPages } from './project/useProjectPages';
import { useProjectPersistence } from './project/useProjectPersistence';

export default function useProject(setAuthed: (authed: boolean) => void) {
  const initialProject = createInitialProject();
  const history = useProjectHistory(initialProject);
  const pages = useProjectPages({
    project: history.project,
    applyChange: history.applyChange,
  });
  const persistence = useProjectPersistence({
    project: history.project,
    setProject: history.setProject,
    resetProject: history.resetProject,
    setSelectedPageId: pages.setSelectedPageId,
    setAuthed,
  });
  const blocks = useProjectBlocks({
    selectedPageId: pages.selectedPageId,
    applyChange: history.applyChange,
    setProject: history.setProject,
    setSelectedPageId: pages.setSelectedPageId,
    setSaveError: persistence.setSaveError,
  });

  return {
    project: history.project,
    setProject: history.setProject,
    selectedPageId: pages.selectedPageId,
    setSelectedPageId: pages.setSelectedPageId,
    page: pages.page,
    selectedBlock: blocks.selectedBlock,
    setSelectedBlock: blocks.setSelectedBlock,
    addBlock: blocks.addBlock,
    applyBlockTransaction: blocks.applyBlockTransaction,
    applyProjectTransaction: blocks.applyProjectTransaction,
    addPage: pages.addPage,
    selectPage: pages.selectPage,
    renamePage: pages.renamePage,
    deletePage: pages.deletePage,
    openProject: persistence.openProject,
    loadProjectById: persistence.loadProjectById,
    editBlock: blocks.editBlock,
    deleteBlock: blocks.deleteBlock,
    saveProject: persistence.saveProject,
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    onReorder: blocks.onReorder,
    isSaving: persistence.isSaving,
    lastSavedAt: persistence.lastSavedAt,
    saveError: persistence.saveError,
  };
}
