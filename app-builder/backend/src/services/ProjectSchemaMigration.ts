import type { ProjectRecord } from '../repositories/ProjectRepository.js';

const CURRENT_SCHEMA_VERSION = 4;

export function migrateProjectRecord(project: ProjectRecord): ProjectRecord {
  return {
    ...project,
    schemaVersion: Math.max(project.schemaVersion || 1, CURRENT_SCHEMA_VERSION),
    pages: (project.pages || []).map((page) => ({
      ...page,
      blocks: (page.blocks || []).map(migrateButtonBlock),
    })),
  };
}

function migrateButtonBlock(block: unknown) {
  if (!isRecord(block)) return block;
  if (block.type !== 'navButton' && block.type !== 'submitButton') return block;

  const props = isRecord(block.props) ? { ...block.props } : {};
  if (!isRecord(props.action)) {
    if (block.type === 'navButton') {
      props.action = {
        type: 'navigate',
        targetPageId: typeof props.toPageId === 'string' ? props.toPageId : '',
      };
    } else {
      const submitGroupId = typeof props.submitGroupId === 'string' && props.submitGroupId.trim()
        ? props.submitGroupId.trim()
        : 'default';
      const collectionId = typeof props.collectionId === 'string' ? props.collectionId.trim() : '';
      props.action = {
        type: 'submitData',
        submitGroupId,
        ...(collectionId ? { collectionId } : {}),
      };
    }
  }
  if (typeof props.label !== 'string' || !props.label) {
    props.label = block.type === 'submitButton' ? 'Submit' : 'Go';
  }
  delete props.toPageId;

  return { ...block, type: 'button', props };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
