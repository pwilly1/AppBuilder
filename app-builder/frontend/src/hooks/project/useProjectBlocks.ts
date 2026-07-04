import { useState, type Dispatch, type SetStateAction } from 'react';
import type { Block, Project } from '../../shared/schema/types';
import { findFirstAvailablePlacement, getBlockGridConstraints } from '../../shared/schema/gridLayout';

type UseProjectBlocksOptions = {
  selectedPageId: string;
  applyChange: (mutator: (project: Project) => Project) => void;
  setProject: Dispatch<SetStateAction<Project>>;
  setSelectedPageId: (id: string) => void;
  setSaveError: (message: string | null) => void;
};

export function useProjectBlocks({
  selectedPageId,
  applyChange,
  setProject,
  setSelectedPageId,
  setSaveError,
}: UseProjectBlocksOptions) {
  const [selectedBlock, setSelectedBlock] = useState<any | null>(null);

  function addBlock(block: Block) {
    applyChange((project) => ({
      ...project,
      pages: project.pages.map((page) => {
        if (page.id !== selectedPageId) return page;

        const nextBlock = { ...block };
        if (!nextBlock.layout?.grid) {
          const collisionScope = nextBlock.parentId
            ? page.blocks.filter((candidate) => candidate.parentId === nextBlock.parentId)
            : page.blocks.filter((candidate) => !candidate.parentId);
          nextBlock.layout = {
            ...(nextBlock.layout || {}),
            grid: findFirstAvailablePlacement(collisionScope, getBlockGridConstraints(nextBlock)),
          };
        }

        return { ...page, blocks: [...page.blocks, nextBlock] };
      }),
    }));
  }

  function applyBlockTransaction(
    mutator: (blocks: Block[]) => Block[],
    options: { pageId?: string } = {},
  ) {
    const targetPageId = options.pageId ?? selectedPageId;
    applyChange((project) => ({
      ...project,
      pages: project.pages.map((page) => (
        page.id === targetPageId ? { ...page, blocks: mutator(page.blocks) } : page
      )),
    }));
    setSaveError(null);
  }

  function applyProjectTransaction(
    mutator: (project: Project) => Project,
    options: { selectedPageId?: string } = {},
  ) {
    applyChange((project) => mutator(project));
    if (options.selectedPageId) setSelectedPageId(options.selectedPageId);
    setSaveError(null);
  }

  function editBlock(updated: Block, options: { recordHistory?: boolean } = {}) {
    if (options.recordHistory === false) {
      setProject((currentProject) => ({
        ...currentProject,
        pages: currentProject.pages.map((page) =>
          page.id === selectedPageId
            ? { ...page, blocks: page.blocks.map((block) => (block.id === updated.id ? updated : block)) }
            : page,
        ),
      }));
      setSelectedBlock(updated);
      setSaveError(null);
      return;
    }

    applyChange((project) => ({
      ...project,
      pages: project.pages.map((page) => (
        page.id === selectedPageId
          ? { ...page, blocks: page.blocks.map((block) => (block.id === updated.id ? updated : block)) }
          : page
      )),
    }));
    setSelectedBlock(updated);
    setSaveError(null);
  }

  function deleteBlock(id: string) {
    applyChange((project) => ({
      ...project,
      pages: project.pages.map((page) => (
        page.id === selectedPageId
          ? { ...page, blocks: page.blocks.filter((block) => block.id !== id && block.parentId !== id) }
          : page
      )),
    }));
  }

  function onReorder(newBlocks: Block[]) {
    applyChange((project) => ({
      ...project,
      pages: project.pages.map((page) => (
        page.id === selectedPageId ? { ...page, blocks: newBlocks } : page
      )),
    }));
  }

  return {
    selectedBlock,
    setSelectedBlock,
    addBlock,
    applyBlockTransaction,
    applyProjectTransaction,
    editBlock,
    deleteBlock,
    onReorder,
  };
}
