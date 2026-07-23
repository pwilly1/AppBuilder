import type { ProjectRecord } from '../repositories/ProjectRepository.js';

const EXPLICIT_SUBMIT_FIELDS_SCHEMA_VERSION = 5;
const CURRENT_SCHEMA_VERSION = 6;

export function migrateProjectRecord(project: ProjectRecord): ProjectRecord {
  const migrateLegacySubmissionGroups = (project.schemaVersion || 1) < EXPLICIT_SUBMIT_FIELDS_SCHEMA_VERSION;
  return {
    ...project,
    schemaVersion: Math.max(project.schemaVersion || 1, CURRENT_SCHEMA_VERSION),
    pages: (project.pages || []).map((page) => {
      const textFieldsMigrated = (page.blocks || []).map(migrateTextFieldBlock);
      const legacyButtonsMigrated = textFieldsMigrated.map(migrateButtonBlock);
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
            .filter(isSubmissionFieldBlock)
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

    if (isSubmissionFieldBlock(block)) delete props.submitGroupId;
    return { ...block, props };
  });
}

function migrateTextFieldBlock(block: unknown) {
  if (!isRecord(block) || (block.type !== 'input' && block.type !== 'textarea')) return block;

  const legacyType = block.type;
  const oldProps = isRecord(block.props) ? block.props : {};
  const fieldLabel = typeof oldProps.label === 'string' && oldProps.label.trim()
    ? oldProps.label.trim()
    : legacyType === 'textarea' ? 'Message' : 'Label';
  const props: Record<string, unknown> = {
    value: typeof oldProps.value === 'string' ? oldProps.value : '',
    fontSize: Number(oldProps.fontSize) || 14,
    contentPadding: 8,
    textColor: typeof oldProps.textColor === 'string' ? oldProps.textColor : '#0f172a',
    editable: true,
    textInputMode: legacyType === 'textarea' ? 'multiline' : 'singleLine',
    inputType: legacyType === 'input' && typeof oldProps.inputType === 'string' ? oldProps.inputType : 'text',
    fieldLabel,
    showFieldLabel: true,
    fieldKey: typeof oldProps.fieldKey === 'string' ? oldProps.fieldKey : '',
    required: Boolean(oldProps.required),
    placeholder: typeof oldProps.placeholder === 'string'
      ? oldProps.placeholder
      : legacyType === 'textarea' ? 'Write something...' : 'Placeholder',
    backgroundColor: typeof oldProps.backgroundColor === 'string' ? oldProps.backgroundColor : '#ffffff',
    placeholderColor: typeof oldProps.placeholderColor === 'string' ? oldProps.placeholderColor : '#94a3b8',
    borderColor: typeof oldProps.borderColor === 'string' ? oldProps.borderColor : '#cbd5e1',
    borderWidth: 1,
    borderRadius: Math.max(0, Number(oldProps.borderRadius) || 0),
  };
  if (typeof oldProps.submitGroupId === 'string') props.submitGroupId = oldProps.submitGroupId;

  return { ...block, type: 'text', props };
}

function isSubmissionFieldBlock(block: unknown) {
  if (!isRecord(block)) return false;
  if (block.type === 'checkbox' || block.type === 'toggle') return true;
  const props = isRecord(block.props) ? block.props : {};
  return block.type === 'text' && props.editable === true;
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
