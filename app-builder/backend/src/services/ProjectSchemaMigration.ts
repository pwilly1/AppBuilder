import type { ProjectRecord } from '../repositories/ProjectRepository.js';

const CURRENT_SCHEMA_VERSION = 5;
const SUBMISSION_FIELD_TYPES = new Set(['input', 'textarea', 'checkbox', 'toggle']);

export function migrateProjectRecord(project: ProjectRecord): ProjectRecord {
  const migrateLegacySubmissionGroups = (project.schemaVersion || 1) < CURRENT_SCHEMA_VERSION;
  return {
    ...project,
    schemaVersion: Math.max(project.schemaVersion || 1, CURRENT_SCHEMA_VERSION),
    pages: (project.pages || []).map((page) => {
      const legacyButtonsMigrated = (page.blocks || []).map(migrateButtonBlock);
      return {
        ...page,
        blocks: migrateLegacySubmissionGroups
          ? migrateExplicitSubmitFields(legacyButtonsMigrated)
          : legacyButtonsMigrated,
      };
    }),
  };
}

function migrateExplicitSubmitFields(blocks: any[]) {
  return blocks.map((block) => {
    if (!isRecord(block)) return block;
    const props = isRecord(block.props) ? { ...block.props } : {};
    const action = isRecord(props.action) ? props.action : null;

    if (block.type === 'button' && action?.type === 'submitData') {
      const submitGroupId = typeof action.submitGroupId === 'string' && action.submitGroupId.trim()
        ? action.submitGroupId.trim()
        : typeof props.submitGroupId === 'string' && props.submitGroupId.trim()
          ? props.submitGroupId.trim()
          : 'default';
      const existingFields = Array.isArray(action.fields)
        ? action.fields.filter(isSubmitFieldRef)
        : [];
      const fields = existingFields.length > 0
        ? existingFields
        : blocks
            .filter(isRecord)
            .filter((candidate) => SUBMISSION_FIELD_TYPES.has(String(candidate.type)))
            .filter((candidate) => {
              const candidateProps = isRecord(candidate.props) ? candidate.props : {};
              const candidateGroup = typeof candidateProps.submitGroupId === 'string' && candidateProps.submitGroupId.trim()
                ? candidateProps.submitGroupId.trim()
                : 'default';
              return candidateGroup === submitGroupId;
            })
            .map((candidate) => {
              const candidateProps = isRecord(candidate.props) ? candidate.props : {};
              const targetFieldKey = typeof candidateProps.fieldKey === 'string' ? candidateProps.fieldKey.trim() : '';
              return {
                fieldBlockId: String(candidate.id),
                ...(targetFieldKey ? { targetFieldKey } : {}),
              };
            });
      const collectionId = typeof action.collectionId === 'string' && action.collectionId.trim()
        ? action.collectionId.trim()
        : typeof props.collectionId === 'string' && props.collectionId.trim()
          ? props.collectionId.trim()
          : '';

      props.action = { type: 'submitData', fields, ...(collectionId ? { collectionId } : {}) };
      delete props.submitGroupId;
      delete props.collectionId;
    }

    if (SUBMISSION_FIELD_TYPES.has(String(block.type))) delete props.submitGroupId;
    return { ...block, props };
  });
}

function isSubmitFieldRef(value: unknown) {
  return isRecord(value) && typeof value.fieldBlockId === 'string' && Boolean(value.fieldBlockId.trim());
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
