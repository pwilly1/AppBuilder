import type {
  AppDataCollection,
  Block,
  BlockAction,
  PageStateVariable,
  SubmitDataFieldRef,
} from '../shared/schema/types';
import { isSupportedExternalUrl, normalizeBlockAction } from '../shared/actions/blockActions';

export type PageLite = { id: string; title?: string; path?: string };
export type ActionType = BlockAction['type'] | '';

type BehaviorValidationContext = {
  block: Block;
  pages?: PageLite[];
  pageBlocks: Block[];
  pageStateVariables: PageStateVariable[];
  dataCollections: AppDataCollection[];
  allowDataActions?: boolean;
};

export function validateBehaviorDraft(
  rawAction: unknown,
  {
    block,
    pages,
    pageBlocks,
    pageStateVariables,
    dataCollections,
    allowDataActions = false,
  }: BehaviorValidationContext,
): string | null {
  const rawType = readActionType(
    rawAction && typeof rawAction === 'object' && !Array.isArray(rawAction)
      ? (rawAction as Record<string, unknown>).type
      : '',
  );
  if (!rawType) return null;

  const action = normalizeBlockAction(rawAction);
  if (!action) return 'Choose a supported behavior before saving.';

  if (action.type === 'navigate') {
    if (!action.targetPageId) return 'Choose the page this block should open.';
    if (!(pages || []).some((page) => page.id === action.targetPageId)) {
      return 'The selected destination page no longer exists.';
    }
  }

  if (action.type === 'openUrl' && !isSupportedExternalUrl(action.url)) {
    return 'Enter a complete HTTP or HTTPS web address.';
  }

  if (action.type === 'submitData') {
    if (!allowDataActions) return 'This block cannot save data.';
    const availableFields = getAvailableSubmissionFields(block, pageBlocks);
    const availableFieldsById = new Map(availableFields.map((field) => [field.id, field]));
    if (action.fields.length === 0) return 'Select at least one input to save.';
    if (action.fields.some((field) => !availableFieldsById.has(field.fieldBlockId))) {
      return 'One selected input is missing or is no longer available to this button.';
    }

    if (action.collectionId) {
      const collection = dataCollections.find((candidate) => candidate.id === action.collectionId);
      if (!collection) return 'The selected collection no longer exists.';
      if (action.fields.some((field) => !field.targetFieldKey)) {
        return 'Choose a collection field for every selected input.';
      }
      const targetKeys = action.fields.map((field) => field.targetFieldKey as string);
      if (new Set(targetKeys).size !== targetKeys.length) {
        return 'Each selected input must save to a different collection field.';
      }
      for (const field of action.fields) {
        const source = availableFieldsById.get(field.fieldBlockId);
        const target = collection.fields.find((candidate) => candidate.key === field.targetFieldKey);
        if (!target) return 'One selected collection field no longer exists.';
        if (source && isBooleanSubmissionField(source) !== (target.type === 'boolean')) {
          return `${getSubmissionFieldLabel(source)} is mapped to an incompatible collection field.`;
        }
      }
    }
  }

  if (action.type === 'signUpAppUser' || action.type === 'loginAppUser') {
    if (!allowDataActions) return 'This block cannot manage app-user accounts.';
    const editableFieldIds = new Set(getAvailableEditableTextFields(block, pageBlocks).map((field) => field.id));
    if (!action.emailFieldBlockId) return 'Choose the editable Text block that contains the email.';
    if (!action.passwordFieldBlockId) return 'Choose the editable Text block that contains the password.';
    if (action.emailFieldBlockId === action.passwordFieldBlockId) {
      return 'Email and password must use different editable Text blocks.';
    }
    if (!editableFieldIds.has(action.emailFieldBlockId) || !editableFieldIds.has(action.passwordFieldBlockId)) {
      return 'The selected email or password input is no longer available.';
    }
    if (
      action.type === 'signUpAppUser'
      && action.displayNameFieldBlockId
      && !editableFieldIds.has(action.displayNameFieldBlockId)
    ) {
      return 'The selected display-name input is no longer available.';
    }
  }

  if (action.type === 'setPageState') {
    if (!action.variableId) return 'Choose the page value this behavior should change.';
    if (!pageStateVariables.some((variable) => variable.id === action.variableId)) {
      return 'The selected page value no longer exists.';
    }
    if (action.value.source === 'formValue') {
      const editableFieldIds = new Set(getAvailableEditableTextFields(block, pageBlocks).map((field) => field.id));
      if (!action.value.fieldBlockId || !editableFieldIds.has(action.value.fieldBlockId)) {
        return 'Choose an available editable Text block as the value source.';
      }
    }
  }

  return null;
}

export function getAvailableSubmissionFields(block: Block, pageBlocks: Block[]) {
  const activeFormId = findOwningFormId(block, pageBlocks);
  return pageBlocks.filter((candidate) => (
    isSubmissionField(candidate)
    && findOwningFormId(candidate, pageBlocks) === activeFormId
  ));
}

export function getAvailableEditableTextFields(block: Block, pageBlocks: Block[]) {
  const formIds = new Set(pageBlocks.filter((candidate) => candidate.type === 'form').map((candidate) => candidate.id));
  const actionFormScope = block.parentId && formIds.has(block.parentId) ? block.parentId : null;
  return pageBlocks.filter((candidate) => {
    if (candidate.type !== 'text' || candidate.props.editable !== true) return false;
    const candidateFormScope = candidate.parentId && formIds.has(candidate.parentId) ? candidate.parentId : null;
    return candidateFormScope === actionFormScope;
  });
}

export function autoMapSubmissionFields(
  selectedFields: SubmitDataFieldRef[],
  collection: AppDataCollection,
  submissionFields: Block[],
  replaceExisting = false,
) {
  const usedKeys = new Set(
    replaceExisting
      ? []
      : selectedFields.map((field) => field.targetFieldKey).filter((key): key is string => Boolean(key)),
  );

  return selectedFields.map((selectedField) => {
    if (selectedField.targetFieldKey && !replaceExisting) return selectedField;
    const source = submissionFields.find((field) => field.id === selectedField.fieldBlockId);
    if (!source) return { fieldBlockId: selectedField.fieldBlockId };

    const compatibleTargets = collection.fields.filter((target) => (
      !usedKeys.has(target.key)
      && (isBooleanSubmissionField(source) ? target.type === 'boolean' : target.type !== 'boolean')
    ));
    const sourceNames = [
      source.props.fieldKey,
      source.props.fieldLabel,
      source.props.label,
      source.props.placeholder,
      source.props.value,
    ]
      .map((value) => normalizeName(value))
      .filter(Boolean);
    let target = compatibleTargets.find((candidate) => {
      const targetNames = [normalizeName(candidate.key), normalizeName(candidate.label)];
      return sourceNames.some((sourceName) => targetNames.includes(sourceName));
    });

    if (!target && source.type === 'text' && source.props.inputType === 'email') {
      target = compatibleTargets.find((candidate) => candidate.type === 'email');
    }
    if (!target && compatibleTargets.length === 1) target = compatibleTargets[0];
    if (target) usedKeys.add(target.key);

    return {
      fieldBlockId: selectedField.fieldBlockId,
      ...(target ? { targetFieldKey: target.key } : {}),
    };
  });
}

export function findSuggestedAuthField(fields: Block[], type: 'email' | 'password') {
  return fields.find((field) => field.props.inputType === type)
    ?? fields.find((field) => normalizeName(getSubmissionFieldLabel(field)).includes(type));
}

export function friendlyFieldType(type: AppDataCollection['fields'][number]['type']) {
  if (type === 'boolean') return 'Yes / No';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function isBooleanSubmissionField(block: Block) {
  return block.type === 'checkbox' || block.type === 'toggle';
}

export function getSubmissionFieldLabel(block: Block) {
  return String(block.props.fieldLabel || block.props.label || block.props.placeholder || block.props.value || block.type);
}

export function normalizeFieldRefs(value: unknown): SubmitDataFieldRef[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const fields: SubmitDataFieldRef[] = [];
  for (const candidate of value) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue;
    const fieldBlockId = readString((candidate as Record<string, unknown>).fieldBlockId);
    if (!fieldBlockId || seen.has(fieldBlockId)) continue;
    seen.add(fieldBlockId);
    const targetFieldKey = readString((candidate as Record<string, unknown>).targetFieldKey);
    fields.push({ fieldBlockId, ...(targetFieldKey ? { targetFieldKey } : {}) });
  }
  return fields;
}

export function readActionType(value: unknown): ActionType {
  const type = readString(value);
  if (
    type === 'navigate'
    || type === 'submitData'
    || type === 'openUrl'
    || type === 'setPageState'
    || type === 'signUpAppUser'
    || type === 'loginAppUser'
    || type === 'logoutAppUser'
  ) {
    return type;
  }
  return '';
}

export function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function isSubmissionField(block: Block) {
  return block.type === 'checkbox'
    || block.type === 'toggle'
    || (block.type === 'text' && block.props.editable === true);
}

function findOwningFormId(block: Block | null | undefined, pageBlocks: Block[]) {
  if (!block) return null;
  const blocksById = new Map(pageBlocks.map((candidate) => [candidate.id, candidate]));
  let parentId = block.parentId;
  const visited = new Set<string>();

  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = blocksById.get(parentId);
    if (!parent) return null;
    if (parent.type === 'form') return parent.id;
    parentId = parent.parentId;
  }

  return null;
}

function normalizeName(value: unknown) {
  return readString(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}
