import React from 'react';
import {
  useWatch,
  type Control,
  type FieldValues,
  type UseFormGetValues,
  type UseFormRegister,
  type UseFormSetValue,
} from 'react-hook-form';
import type { AppDataCollection, Block, PageStateVariable } from '../shared/schema/types';
import {
  autoMapSubmissionFields,
  findSuggestedAuthField,
  friendlyFieldType,
  getAvailableEditableTextFields,
  getAvailableSubmissionFields,
  getSubmissionFieldLabel,
  isBooleanSubmissionField,
  normalizeFieldRefs,
  readActionType,
  readString,
  validateBehaviorDraft,
  type ActionType,
  type PageLite,
} from './behaviorBuilderUtils';

type InspectorFormValues = FieldValues;

type BehaviorBuilderProps = {
  block: Block;
  pages?: PageLite[];
  pageBlocks: Block[];
  pageStateVariables: PageStateVariable[];
  dataCollections: AppDataCollection[];
  allowDataActions?: boolean;
  control: Control<InspectorFormValues>;
  register: UseFormRegister<InspectorFormValues>;
  getValues: UseFormGetValues<InspectorFormValues>;
  setValue: UseFormSetValue<InspectorFormValues>;
  error?: string | null;
  onClearError?: () => void;
};

const COMMON_ACTION_OPTIONS: Array<{ value: ActionType; label: string }> = [
  { value: '', label: 'Do nothing' },
  { value: 'navigate', label: 'Go to another page' },
  { value: 'openUrl', label: 'Open a web link' },
  { value: 'setPageState', label: 'Change page data' },
];

const BUTTON_ACTION_OPTIONS: Array<{ value: ActionType; label: string }> = [
  { value: 'submitData', label: 'Save data' },
  { value: 'signUpAppUser', label: 'Create an app account' },
  { value: 'loginAppUser', label: 'Sign in an app user' },
  { value: 'logoutAppUser', label: 'Sign out the app user' },
];

export default function BehaviorBuilder({
  block,
  pages,
  pageBlocks,
  pageStateVariables,
  dataCollections,
  allowDataActions = false,
  control,
  register,
  getValues,
  setValue,
  error,
  onClearError,
}: BehaviorBuilderProps) {
  const actionDraft = useWatch({ control, name: 'action' }) as Record<string, unknown> | undefined;
  const dataSourceName = useWatch({ control, name: 'dataSourceName' }) as string | undefined;
  const actionType = readActionType(actionDraft?.type);
  const selectedSubmitFields = normalizeFieldRefs(actionDraft?.fields);
  const selectedCollectionId = readString(actionDraft?.collectionId);
  const selectedCollection = dataCollections.find((collection) => collection.id === selectedCollectionId) ?? null;
  const actionValue = readRecord(actionDraft?.value);
  const actionValueSource = readString(actionValue?.source) || 'static';
  const selectedValueFieldId = readString(actionValue?.fieldBlockId);
  const submissionFields = React.useMemo(
    () => getAvailableSubmissionFields(block, pageBlocks),
    [block, pageBlocks],
  );
  const editableTextFields = React.useMemo(
    () => getAvailableEditableTextFields(block, pageBlocks),
    [block, pageBlocks],
  );
  const validationError = validateBehaviorDraft(actionDraft, {
    block,
    pages,
    pageBlocks,
    pageStateVariables,
    dataCollections,
    allowDataActions,
  });
  const summary = getBehaviorSummary(actionDraft, {
    pages,
    dataCollections,
    submissionFields,
    dataSourceName,
  });
  const status = !actionType ? 'idle' : validationError ? 'incomplete' : 'ready';
  const options = allowDataActions
    ? [COMMON_ACTION_OPTIONS[0], COMMON_ACTION_OPTIONS[1], ...BUTTON_ACTION_OPTIONS, ...COMMON_ACTION_OPTIONS.slice(2)]
    : COMMON_ACTION_OPTIONS;

  function clearError() {
    onClearError?.();
  }

  function handleActionTypeChange(nextType: ActionType) {
    clearError();

    if (nextType === 'submitData') {
      const current = normalizeFieldRefs(getValues('action.fields'));
      const selected = current.length > 0
        ? current
        : submissionFields.map((field) => ({ fieldBlockId: field.id }));
      setValue(
        'action.fields',
        selectedCollection
          ? autoMapSubmissionFields(selected, selectedCollection, submissionFields)
          : selected,
        { shouldDirty: true },
      );
    }

    if (nextType === 'signUpAppUser' || nextType === 'loginAppUser') {
      const currentEmailId = readString(getValues('action.emailFieldBlockId'));
      const currentPasswordId = readString(getValues('action.passwordFieldBlockId'));
      if (!currentEmailId) {
        const emailField = findSuggestedAuthField(editableTextFields, 'email');
        if (emailField) setValue('action.emailFieldBlockId', emailField.id, { shouldDirty: true });
      }
      if (!currentPasswordId) {
        const passwordField = findSuggestedAuthField(editableTextFields, 'password');
        if (passwordField) setValue('action.passwordFieldBlockId', passwordField.id, { shouldDirty: true });
      }
    }

    if (nextType === 'setPageState') {
      if (!readString(getValues('action.variableId')) && pageStateVariables[0]) {
        setValue('action.variableId', pageStateVariables[0].id, { shouldDirty: true });
      }
      if (!readString(getValues('action.value.source'))) {
        setValue('action.value.source', 'static', { shouldDirty: true });
      }
    }
  }

  function handleCollectionChange(collectionId: string) {
    clearError();
    const collection = dataCollections.find((candidate) => candidate.id === collectionId) ?? null;
    const current = normalizeFieldRefs(getValues('action.fields'));
    if (!collection) {
      setValue(
        'action.fields',
        current.map((field) => ({ fieldBlockId: field.fieldBlockId })),
        { shouldDirty: true },
      );
      return;
    }

    const selected = current.length > 0
      ? current
      : submissionFields.map((field) => ({ fieldBlockId: field.id }));
    setValue(
      'action.fields',
      autoMapSubmissionFields(selected, collection, submissionFields),
      { shouldDirty: true },
    );
  }

  function updateSubmitField(fieldBlockId: string, selected: boolean) {
    clearError();
    const current = normalizeFieldRefs(getValues('action.fields'));
    const next = selected
      ? current.some((field) => field.fieldBlockId === fieldBlockId)
        ? current
        : [...current, { fieldBlockId }]
      : current.filter((field) => field.fieldBlockId !== fieldBlockId);
    setValue(
      'action.fields',
      selectedCollection
        ? autoMapSubmissionFields(next, selectedCollection, submissionFields)
        : next,
      { shouldDirty: true },
    );
  }

  function updateSubmitFieldTarget(fieldBlockId: string, targetFieldKey: string) {
    clearError();
    const current = normalizeFieldRefs(getValues('action.fields'));
    setValue(
      'action.fields',
      current.map((field) => (
        field.fieldBlockId === fieldBlockId
          ? { fieldBlockId, ...(targetFieldKey ? { targetFieldKey } : {}) }
          : field
      )),
      { shouldDirty: true },
    );
  }

  function selectAllSubmissionFields() {
    clearError();
    const allFields = submissionFields.map((field) => ({ fieldBlockId: field.id }));
    setValue(
      'action.fields',
      selectedCollection
        ? autoMapSubmissionFields(allFields, selectedCollection, submissionFields)
        : allFields,
      { shouldDirty: true },
    );
  }

  function clearSubmissionFields() {
    clearError();
    setValue('action.fields', [], { shouldDirty: true });
  }

  function remapSubmissionFields() {
    if (!selectedCollection) return;
    clearError();
    setValue(
      'action.fields',
      autoMapSubmissionFields(selectedSubmitFields, selectedCollection, submissionFields, true),
      { shouldDirty: true },
    );
  }

  return (
    <section className="editor-section">
      <div className="mb-3">
        <div className="editor-section-title">Behavior</div>
        <p className="mt-1 text-sm text-slate-500">Choose what this block does when an app user taps it.</p>
      </div>

      <div className="grid gap-3">
        <div className="grid gap-2">
          <FieldLabel>When tapped</FieldLabel>
          <select
            className="inspector-input"
            {...register('action.type', {
              onChange: (event) => handleActionTypeChange(readActionType(event.currentTarget.value)),
            })}
          >
            {options.map((option) => (
              <option key={option.value || 'none'} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className={`behavior-summary behavior-summary-${status}`}>
          <div className="behavior-summary-label">
            {status === 'ready' ? 'Ready' : status === 'incomplete' ? 'Needs setup' : 'No behavior'}
          </div>
          <div className="behavior-summary-text">{summary}</div>
        </div>

        {actionType === 'navigate' ? (
          <BehaviorStep number="1" title="Choose the destination">
            <FieldLabel>Page</FieldLabel>
            <select className="inspector-input" {...register('action.targetPageId', { onChange: clearError })}>
              <option value="">Select a page...</option>
              {(pages || []).map((page) => (
                <option key={page.id} value={page.id}>{page.title || page.id}</option>
              ))}
            </select>
          </BehaviorStep>
        ) : null}

        {actionType === 'openUrl' ? (
          <BehaviorStep number="1" title="Choose the web address">
            <FieldLabel>Web address</FieldLabel>
            <TextInput
              type="url"
              placeholder="https://example.com"
              {...register('action.url', { onChange: clearError })}
            />
            <p className="text-xs text-slate-500">Only HTTP and HTTPS links are supported.</p>
          </BehaviorStep>
        ) : null}

        {allowDataActions && actionType === 'submitData' ? (
          <>
            <BehaviorStep number="1" title="Choose where the data is saved">
              <FieldLabel>Destination</FieldLabel>
              <select
                className="inspector-input"
                {...register('action.collectionId', {
                  onChange: (event) => handleCollectionChange(event.currentTarget.value),
                })}
              >
                <option value="">Quick submission list</option>
                {dataCollections.map((collection) => (
                  <option key={collection.id} value={collection.id}>{collection.name} collection</option>
                ))}
              </select>
              {selectedCollection ? (
                <p className="text-xs leading-5 text-slate-500">
                  These values become reusable fields in the {selectedCollection.name} collection.
                </p>
              ) : (
                <>
                  <FieldLabel>Submission list name</FieldLabel>
                  <TextInput
                    placeholder="Contact Requests"
                    {...register('dataSourceName', { onChange: clearError })}
                  />
                  <p className="text-xs leading-5 text-slate-500">
                    Use this for responses you only need to review or export. Choose a collection when app screens need to reuse the saved data.
                  </p>
                </>
              )}
            </BehaviorStep>

            <BehaviorStep number="2" title="Choose the information to save">
              <div className="behavior-inline-actions">
                <span>{selectedSubmitFields.length} of {submissionFields.length} inputs selected</span>
                <div className="flex gap-2">
                  <button type="button" className="behavior-link-button" onClick={selectAllSubmissionFields}>
                    Select all
                  </button>
                  <button type="button" className="behavior-link-button" onClick={clearSubmissionFields}>
                    Clear
                  </button>
                </div>
              </div>

              {submissionFields.length > 0 ? (
                <div className="grid gap-2">
                  {submissionFields.map((field) => {
                    const selectedField = selectedSubmitFields.find((entry) => entry.fieldBlockId === field.id);
                    const compatibleCollectionFields = selectedCollection?.fields.filter((target) => (
                      isBooleanSubmissionField(field) ? target.type === 'boolean' : target.type !== 'boolean'
                    )) ?? [];
                    return (
                      <div key={field.id} className={`behavior-field-card ${selectedField ? 'is-selected' : ''}`}>
                        <label className="flex items-center gap-3 text-sm font-semibold text-slate-800">
                          <input
                            type="checkbox"
                            className="inspector-toggle"
                            checked={Boolean(selectedField)}
                            onChange={(event) => updateSubmitField(field.id, event.currentTarget.checked)}
                          />
                          <span className="min-w-0 flex-1 truncate">{getSubmissionFieldLabel(field)}</span>
                          <span className="behavior-field-type">
                            {isBooleanSubmissionField(field) ? 'Yes / No' : 'Text'}
                          </span>
                        </label>
                        {selectedField && selectedCollection ? (
                          <div className="mt-3 grid gap-2 border-t border-slate-200 pt-3">
                            <FieldLabel>Save as</FieldLabel>
                            <select
                              className="inspector-input"
                              value={selectedField.targetFieldKey ?? ''}
                              onChange={(event) => updateSubmitFieldTarget(field.id, event.currentTarget.value)}
                            >
                              <option value="">Choose a collection field...</option>
                              {compatibleCollectionFields.map((target) => (
                                <option key={target.id} value={target.key}>
                                  {target.label} ({friendlyFieldType(target.type)})
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Notice tone="warning">
                  Add an editable Text, Checkbox, or Toggle block to this page first.
                </Notice>
              )}

              {selectedCollection && selectedSubmitFields.length > 0 ? (
                <button type="button" className="ghost-btn !justify-center !px-3 !py-2 text-xs" onClick={remapSubmissionFields}>
                  Map fields automatically
                </button>
              ) : null}
            </BehaviorStep>

            <BehaviorStep number="3" title="Choose the success feedback">
              <FieldLabel>Message shown after saving</FieldLabel>
              <TextInput
                placeholder="Submission received."
                {...register('successMessage', { onChange: clearError })}
              />
            </BehaviorStep>
          </>
        ) : null}

        {allowDataActions && (actionType === 'signUpAppUser' || actionType === 'loginAppUser') ? (
          <BehaviorStep number="1" title="Connect the account fields">
            {actionType === 'signUpAppUser' ? (
              <>
                <FieldLabel>Display name input (optional)</FieldLabel>
                <select
                  className="inspector-input"
                  {...register('action.displayNameFieldBlockId', { onChange: clearError })}
                >
                  <option value="">No display name</option>
                  {editableTextFields.map((field) => (
                    <option key={field.id} value={field.id}>{getSubmissionFieldLabel(field)}</option>
                  ))}
                </select>
              </>
            ) : null}

            <FieldLabel>Email input</FieldLabel>
            <select className="inspector-input" {...register('action.emailFieldBlockId', { onChange: clearError })}>
              <option value="">Select an editable Text block...</option>
              {editableTextFields.map((field) => (
                <option key={field.id} value={field.id}>
                  {getSubmissionFieldLabel(field)}
                  {field.props.inputType === 'email' ? ' (email)' : ''}
                </option>
              ))}
            </select>

            <FieldLabel>Password input</FieldLabel>
            <select className="inspector-input" {...register('action.passwordFieldBlockId', { onChange: clearError })}>
              <option value="">Select an editable Text block...</option>
              {editableTextFields.map((field) => (
                <option key={field.id} value={field.id}>
                  {getSubmissionFieldLabel(field)}
                  {field.props.inputType === 'password' ? ' (password)' : ''}
                </option>
              ))}
            </select>

            <p className="text-xs leading-5 text-slate-500">
              App users are separate from Apptura builder accounts. Email and password inputs are suggested automatically when their keyboard types are configured.
            </p>
            {editableTextFields.length === 0 ? (
              <Notice tone="warning">Add editable Text blocks for email and password first.</Notice>
            ) : null}
          </BehaviorStep>
        ) : null}

        {allowDataActions && actionType === 'logoutAppUser' ? (
          <Notice tone="info">
            Tapping this block will clear the current app-user session for this project.
          </Notice>
        ) : null}

        {actionType === 'setPageState' ? (
          <BehaviorStep number="1" title="Choose the page data to change">
            <FieldLabel>Page value</FieldLabel>
            <select className="inspector-input" {...register('action.variableId', { onChange: clearError })}>
              <option value="">Select a page value...</option>
              {pageStateVariables.map((variable) => (
                <option key={variable.id} value={variable.id}>{variable.name}</option>
              ))}
            </select>

            <FieldLabel>Use a value from</FieldLabel>
            <select
              className="inspector-input"
              {...register('action.value.source', { onChange: clearError })}
            >
              <option value="static">A fixed value</option>
              <option value="formValue">An editable Text block</option>
            </select>

            {actionValueSource === 'formValue' ? (
              <>
                <FieldLabel>Input</FieldLabel>
                <select
                  className="inspector-input"
                  {...register('action.value.fieldBlockId', { onChange: clearError })}
                >
                  <option value="">Select an input...</option>
                  {selectedValueFieldId && !editableTextFields.some((field) => field.id === selectedValueFieldId) ? (
                    <option value={selectedValueFieldId}>Missing input</option>
                  ) : null}
                  {editableTextFields.map((field) => (
                    <option key={field.id} value={field.id}>{getSubmissionFieldLabel(field)}</option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <FieldLabel>New value</FieldLabel>
                <TextInput
                  placeholder="Value to set when tapped"
                  {...register('action.value.value', { onChange: clearError })}
                />
              </>
            )}

            {pageStateVariables.length === 0 ? (
              <Notice tone="warning">Add a page value in the Data workspace before configuring this behavior.</Notice>
            ) : (
              <p className="text-xs text-slate-500">This value resets when the page runtime is recreated.</p>
            )}
          </BehaviorStep>
        ) : null}

        {error ? <Notice tone="error">{error}</Notice> : null}
      </div>
    </section>
  );
}

function BehaviorStep({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="behavior-step">
      <div className="behavior-step-heading">
        <span className="behavior-step-number">{number}</span>
        <span>{title}</span>
      </div>
      <div className="grid gap-2">{children}</div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{children}</label>;
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`inspector-input ${props.className ?? ''}`} />;
}

function Notice({
  tone,
  children,
}: {
  tone: 'info' | 'warning' | 'error';
  children: React.ReactNode;
}) {
  return <div className={`behavior-notice behavior-notice-${tone}`}>{children}</div>;
}

function getBehaviorSummary(
  rawAction: Record<string, unknown> | undefined,
  {
    pages,
    dataCollections,
    submissionFields,
    dataSourceName,
  }: {
    pages?: PageLite[];
    dataCollections: AppDataCollection[];
    submissionFields: Block[];
    dataSourceName?: string;
  },
) {
  const actionType = readActionType(rawAction?.type);
  if (!actionType) return 'This block is visual only and does not perform an action.';

  if (actionType === 'navigate') {
    const targetPageId = readString(rawAction?.targetPageId);
    const page = (pages || []).find((candidate) => candidate.id === targetPageId);
    return page ? `Opens ${page.title || page.id}.` : 'Choose the page this block should open.';
  }

  if (actionType === 'submitData') {
    const selected = normalizeFieldRefs(rawAction?.fields);
    const collectionId = readString(rawAction?.collectionId);
    const collection = dataCollections.find((candidate) => candidate.id === collectionId);
    const destination = collection?.name || readString(dataSourceName) || 'a quick submission list';
    const validSelectedCount = selected.filter((field) => (
      submissionFields.some((candidate) => candidate.id === field.fieldBlockId)
    )).length;
    return `Saves ${validSelectedCount} ${validSelectedCount === 1 ? 'input' : 'inputs'} to ${destination}.`;
  }

  if (actionType === 'signUpAppUser') return 'Creates an account using connected email and password inputs.';
  if (actionType === 'loginAppUser') return 'Signs in using connected email and password inputs.';
  if (actionType === 'logoutAppUser') return 'Signs out the current app user.';
  if (actionType === 'openUrl') {
    const url = readString(rawAction?.url);
    return url ? `Opens ${url}.` : 'Choose the web address this block should open.';
  }
  if (actionType === 'setPageState') return 'Updates a page value for the current runtime session.';
  return 'Choose what this block should do.';
}

function readRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}
