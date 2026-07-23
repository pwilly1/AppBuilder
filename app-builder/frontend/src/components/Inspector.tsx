import React from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import type { AppDataCollection, Block, PageStateVariable, SubmitDataFieldRef } from '../shared/schema/types';
import { getBlockEditorPlacement } from '../shared/schema/runtimeLayout';
import { getBlockContentScale } from '../shared/schema/contentScale';
import { listProjectAppDataRecords, uploadProjectImage, type ProjectAppDataRecord } from '../api';
import { normalizeBlockAction, resolveBlockAction } from '../shared/actions/blockActions';
import { BlockRegistry } from '../shared/schema/registry';

type PageLite = { id: string; title?: string; path?: string };

type TextBindingDraft =
  | { source: 'static' }
  | { source: 'pageState'; variableId: string }
  | {
      source: 'collection';
      collectionId: string;
      fieldId: string;
      recordMode: 'latest' | 'specific';
      recordId: string;
    };

type InspectorProps = {
  block?: Block | null;
  projectId?: string;
  pages?: PageLite[];
  pageBlocks?: Block[];
  pageStateVariables?: PageStateVariable[];
  dataCollections?: AppDataCollection[];
  activeContainerId?: string | null;
  onSave?: (b: Block) => void;
  onPreview?: (b: Block) => void;
  onClose?: () => void;
  onDelete?: (id: string) => void;
  onEditContainer?: (b: Block) => void;
  onExitContainer?: () => void;
  onDetachBlock?: (b: Block) => void;
};

function getInspectorDefaultProps(block?: Block | null) {
  if (!block) return {};
  const action = resolveBlockAction(block);
  return {
    ...(block.type === 'text' ? BlockRegistry.text.defaultProps : {}),
    ...(block.props as Record<string, any>),
    ...(action ? { action } : {}),
  };
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{children}</label>;
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`inspector-input ${props.className ?? ''}`} />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`inspector-input min-h-[96px] resize-y ${props.className ?? ''}`} />;
}

function ToggleInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`inspector-toggle ${props.className ?? ''}`} />;
}

function FormSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="editor-section">
      <div className="mb-3">
        <div className="editor-section-title">{title}</div>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function ArrayCard({ title, children, onRemove }: { title: string; children: React.ReactNode; onRemove?: () => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        {onRemove ? (
          <button type="button" className="text-xs font-semibold uppercase tracking-[0.14em] text-red-600 hover:text-red-700" onClick={onRemove}>
            Remove
          </button>
        ) : null}
      </div>
      <div className="grid gap-3">{children}</div>
    </div>
  );
}

export default function Inspector({
  block,
  projectId,
  pages,
  pageBlocks = [],
  pageStateVariables = [],
  dataCollections = [],
  activeContainerId,
  onSave,
  onPreview,
  onClose,
  onDelete,
  onEditContainer,
  onExitContainer,
  onDetachBlock,
}: InspectorProps) {
  const { register, control, handleSubmit, reset, getValues, setValue, watch } = useForm<Record<string, any>>({ defaultValues: getInspectorDefaultProps(block) });
  const servicesArray = useFieldArray({ control, name: 'items' });
  const galleryArray = useFieldArray({ control, name: 'images' });
  const previewedPropsRef = React.useRef<Record<string, any> | null>(null);
  const [imageUploadError, setImageUploadError] = React.useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);
  const [textBinding, setTextBinding] = React.useState<TextBindingDraft>(() => getTextBindingDraft(block));
  const [bindingRecords, setBindingRecords] = React.useState<ProjectAppDataRecord[]>([]);
  const [bindingRecordsLoading, setBindingRecordsLoading] = React.useState(false);
  const [bindingRecordsError, setBindingRecordsError] = React.useState<string | null>(null);
  const [textBindingError, setTextBindingError] = React.useState<string | null>(null);
  const actionType = watch('action.type') as string | undefined;
  const actionValueSource = watch('action.value.source') as string | undefined;
  const selectedActionFieldBlockId = watch('action.value.fieldBlockId') as string | undefined;
  const textEditable = block?.type === 'text' && Boolean(watch('editable'));
  const textInputMode = watch('textInputMode') as string | undefined;
  const watchedSubmitFields = watch('action.fields');
  const selectedSubmitFields = Array.isArray(watchedSubmitFields)
    ? watchedSubmitFields as SubmitDataFieldRef[]
    : [];
  const selectedSubmitCollectionId = watch('action.collectionId') as string | undefined;
  const stateValueFieldBlocks = React.useMemo(() => {
    const formIds = new Set(pageBlocks.filter((candidate) => candidate.type === 'form').map((candidate) => candidate.id));
    const actionFormScope = block?.parentId && formIds.has(block.parentId) ? block.parentId : null;
    return pageBlocks.filter((candidate) => {
      if (candidate.type !== 'text' || candidate.props.editable !== true) return false;
      const candidateFormScope = candidate.parentId && formIds.has(candidate.parentId) ? candidate.parentId : null;
      return candidateFormScope === actionFormScope;
    });
  }, [block?.parentId, pageBlocks]);
  const submitFieldBlocks = React.useMemo(() => {
    const activeFormId = findOwningFormId(block, pageBlocks);
    return pageBlocks.filter((candidate) => (
      isSubmissionField(candidate)
      && findOwningFormId(candidate, pageBlocks) === activeFormId
    ));
  }, [block, pageBlocks]);
  const selectedSubmitCollection = dataCollections.find(
    (collection) => collection.id === selectedSubmitCollectionId,
  ) ?? null;

  React.useEffect(() => {
    if (previewedPropsRef.current === block?.props) {
      previewedPropsRef.current = null;
      return;
    }
    reset(getInspectorDefaultProps(block));
    setTextBinding(getTextBindingDraft(block));
    setImageUploadError(null);
    setTextBindingError(null);
  }, [block, reset]);

  const bindingCollectionId = textBinding.source === 'collection' ? textBinding.collectionId : '';
  const bindingRecordMode = textBinding.source === 'collection' ? textBinding.recordMode : 'latest';

  React.useEffect(() => {
    setBindingRecords([]);
    setBindingRecordsError(null);
    if (bindingRecordMode !== 'specific' || !bindingCollectionId) {
      setBindingRecordsLoading(false);
      return;
    }
    if (!projectId) {
      setBindingRecordsLoading(false);
      setBindingRecordsError('Save the project before choosing a specific record.');
      return;
    }

    let active = true;
    setBindingRecordsLoading(true);
    void listProjectAppDataRecords(projectId, bindingCollectionId)
      .then((records) => {
        if (active) setBindingRecords(records || []);
      })
      .catch((error: unknown) => {
        if (active) {
          setBindingRecordsError(error instanceof Error ? error.message : 'Could not load collection records.');
        }
      })
      .finally(() => {
        if (active) setBindingRecordsLoading(false);
      });

    return () => { active = false; };
  }, [bindingCollectionId, bindingRecordMode, projectId]);

  if (!block) {
    return (
      <div className="editor-section">
        <div className="editor-section-title">Nothing selected</div>
        <h4 className="mt-2 text-xl font-semibold text-slate-900">Choose a block on the canvas</h4>
        <p className="mt-2 text-sm text-slate-500">Once selected, its content and settings will appear here for editing.</p>
      </div>
    );
  }

  const submit = (vals: any) => {
    if (textBinding.source === 'collection' && textBinding.recordMode === 'specific' && !textBinding.recordId) {
      setTextBindingError('Choose a specific record before saving this binding.');
      return;
    }
    setTextBindingError(null);
    const props = { ...(block.props as Record<string, any>), ...vals } as any;
    if (props.fontSize) props.fontSize = Number(props.fontSize);
    if (props.headlineSize) props.headlineSize = Number(props.headlineSize);
    if (props.columns) props.columns = Number(props.columns);
    if (props.thickness !== undefined) props.thickness = Number(props.thickness);
    if (props.contentPadding !== undefined) props.contentPadding = Number(props.contentPadding);
    if (props.buttonPaddingX !== undefined) props.buttonPaddingX = Number(props.buttonPaddingX);
    if (props.buttonPaddingY !== undefined) props.buttonPaddingY = Number(props.buttonPaddingY);
    if (props.paddingX !== undefined) props.paddingX = Number(props.paddingX);
    if (props.paddingY !== undefined) props.paddingY = Number(props.paddingY);
    if (props.borderWidth !== undefined) props.borderWidth = Number(props.borderWidth);
    if (props.borderRadius !== undefined) props.borderRadius = Number(props.borderRadius);
    if (props.opacity !== undefined) props.opacity = Number(props.opacity);
    if (props.positionX !== undefined) props.positionX = Number(props.positionX);
    if (props.positionY !== undefined) props.positionY = Number(props.positionY);
    if (props.value !== undefined && block.type === 'progressBar') props.value = Number(props.value);
    if (block.type === 'button') {
      const action = normalizeBlockAction(props.action);
      if (action) props.action = action;
      else delete props.action;
      delete props.submitGroupId;
      delete props.collectionId;
    }
    if (block.type === 'icon' || block.type === 'image') {
      const action = normalizeBlockAction(props.action);
      if (action) props.action = action;
      else delete props.action;
    }
    const nextBlock: Block = { ...block, props };
    const bindingProperty = getBindableTextProperty(block);
    if (bindingProperty) {
      const bindings = { ...(block.bindings || {}) };
      if (textBinding.source === 'pageState' && textBinding.variableId) {
        bindings[bindingProperty] = { source: 'pageState', variableId: textBinding.variableId };
      } else if (textBinding.source === 'collection' && textBinding.collectionId && textBinding.fieldId) {
        bindings[bindingProperty] = {
          source: 'collection',
          collectionId: textBinding.collectionId,
          fieldId: textBinding.fieldId,
          record: textBinding.recordMode === 'specific'
            ? { mode: 'specific', recordId: textBinding.recordId }
            : { mode: 'latest' },
        };
      } else {
        delete bindings[bindingProperty];
      }
      if (Object.keys(bindings).length > 0) nextBlock.bindings = bindings;
      else delete nextBlock.bindings;
    }
    onSave?.(nextBlock);
  };

  function renderActionControls(allowSubmit = false) {
    return (
      <FormSection title="When tapped" description="Choose what happens when a user taps this block in preview or the Android runtime.">
        <div className="grid gap-2">
          <FieldLabel>Action type</FieldLabel>
          <select className="inspector-input" {...register('action.type')}>
            <option value="">No action</option>
            <option value="navigate">Navigate to page</option>
            {allowSubmit ? <option value="submitData">Submit data</option> : null}
            {allowSubmit ? <option value="signUpAppUser">Sign up app user</option> : null}
            {allowSubmit ? <option value="loginAppUser">Log in app user</option> : null}
            {allowSubmit ? <option value="logoutAppUser">Log out app user</option> : null}
            <option value="openUrl">Open URL</option>
            <option value="setPageState">Set page variable</option>
          </select>
        </div>
        {actionType === 'navigate' ? (
          <div className="grid gap-2">
            <FieldLabel>Target page</FieldLabel>
            <select className="inspector-input" {...register('action.targetPageId')}>
              <option value="">Select a page...</option>
              {(pages || []).map((page) => (
                <option key={page.id} value={page.id}>{page.title || page.id}</option>
              ))}
            </select>
          </div>
        ) : null}
        {actionType === 'openUrl' ? (
          <div className="grid gap-2">
            <FieldLabel>URL</FieldLabel>
            <TextInput type="url" placeholder="https://example.com" {...register('action.url')} />
            <p className="text-xs text-slate-500">Only HTTP and HTTPS links are supported.</p>
          </div>
        ) : null}
        {allowSubmit && actionType === 'submitData' ? (
          <>
            <div className="grid gap-2">
              <FieldLabel>Data source name</FieldLabel>
              <TextInput placeholder="Contact Requests" {...register('dataSourceName')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Store records in</FieldLabel>
              <select
                className="inspector-input"
                {...register('action.collectionId', {
                  onChange: () => clearSubmitFieldTargets(),
                })}
              >
                <option value="">This button's own data source</option>
                {dataCollections.map((collection) => (
                  <option key={collection.id} value={collection.id}>{collection.name}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500">Choose a collection when these records should be reusable by data-bound Text or Hero blocks.</p>
            </div>
            <div className="grid gap-2">
              <FieldLabel>Fields to submit</FieldLabel>
              {submitFieldBlocks.length > 0 ? (
                <div className="grid gap-2">
                  {submitFieldBlocks.map((field) => {
                    const selectedField = selectedSubmitFields.find((entry) => entry.fieldBlockId === field.id);
                    const compatibleCollectionFields = selectedSubmitCollection?.fields.filter((target) => (
                      isBooleanSubmissionField(field) ? target.type === 'boolean' : target.type !== 'boolean'
                    )) ?? [];
                    return (
                      <div key={field.id} className="rounded-xl border border-slate-200 bg-white/80 px-3 py-3">
                        <label className="flex items-center gap-3 text-sm font-medium text-slate-800">
                          <ToggleInput
                            type="checkbox"
                            checked={Boolean(selectedField)}
                            onChange={(event) => updateSubmitField(field.id, event.currentTarget.checked)}
                          />
                          {getSubmissionFieldLabel(field)}
                        </label>
                        {selectedField && selectedSubmitCollection ? (
                          <div className="mt-3 grid gap-2 pl-7">
                            <FieldLabel>Save to collection field</FieldLabel>
                            <select
                              className="inspector-input"
                              value={selectedField.targetFieldKey ?? ''}
                              onChange={(event) => updateSubmitFieldTarget(field.id, event.currentTarget.value)}
                            >
                              <option value="">Choose a field...</option>
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
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                  Add an editable Text, Checkbox, or Toggle block to this page first.
                </p>
              )}
              <p className="text-xs text-slate-500">Only the checked fields are included when this button is tapped.</p>
              {selectedSubmitCollection && selectedSubmitFields.some((field) => !field.targetFieldKey) ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                  Choose a collection field for every checked field before testing this button.
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <FieldLabel>Success message</FieldLabel>
              <TextInput {...register('successMessage')} />
            </div>
          </>
        ) : null}
        {allowSubmit && (actionType === 'signUpAppUser' || actionType === 'loginAppUser') ? (
          <>
            {actionType === 'signUpAppUser' ? (
              <div className="grid gap-2">
                <FieldLabel>Display name field (optional)</FieldLabel>
                <select className="inspector-input" {...register('action.displayNameFieldBlockId')}>
                  <option value="">No display name</option>
                  {stateValueFieldBlocks.map((field) => (
                    <option key={field.id} value={field.id}>
                      {getSubmissionFieldLabel(field)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="grid gap-2">
              <FieldLabel>Email field</FieldLabel>
              <select className="inspector-input" {...register('action.emailFieldBlockId')}>
                <option value="">Select an editable Text block...</option>
                {stateValueFieldBlocks.map((field) => (
                  <option key={field.id} value={field.id}>
                    {getSubmissionFieldLabel(field)}
                    {field.props.inputType === 'email' ? ' (email)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <FieldLabel>Password field</FieldLabel>
              <select className="inspector-input" {...register('action.passwordFieldBlockId')}>
                <option value="">Select an editable Text block...</option>
                {stateValueFieldBlocks.map((field) => (
                  <option key={field.id} value={field.id}>
                    {getSubmissionFieldLabel(field)}
                    {field.props.inputType === 'password' ? ' (password)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs leading-5 text-slate-500">
              App users are separate from Apptura builder accounts. Use editable Text blocks for these fields and set the password field keyboard type to Password.
            </p>
            {stateValueFieldBlocks.length === 0 ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                Add editable Text blocks for email and password first.
              </p>
            ) : null}
          </>
        ) : null}
        {allowSubmit && actionType === 'logoutAppUser' ? (
          <p className="text-xs leading-5 text-slate-500">
            This clears the current generated-app user session for this project.
          </p>
        ) : null}
        {actionType === 'setPageState' ? (
          <>
            <div className="grid gap-2">
              <FieldLabel>Page variable</FieldLabel>
              <select className="inspector-input" {...register('action.variableId')}>
                <option value="">Select a variable...</option>
                {pageStateVariables.map((variable) => (
                  <option key={variable.id} value={variable.id}>{variable.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <FieldLabel>Value source</FieldLabel>
              <select className="inspector-input" defaultValue="static" {...register('action.value.source')}>
                <option value="static">Fixed value</option>
                <option value="formValue">Editable text</option>
              </select>
            </div>
            {actionValueSource === 'formValue' ? (
              <div className="grid gap-2">
                <FieldLabel>Source field</FieldLabel>
                <select className="inspector-input" {...register('action.value.fieldBlockId')}>
                  <option value="">Select a field...</option>
                  {selectedActionFieldBlockId && !stateValueFieldBlocks.some((field) => field.id === selectedActionFieldBlockId) ? (
                    <option value={selectedActionFieldBlockId}>Missing field</option>
                  ) : null}
                  {stateValueFieldBlocks.map((field) => (
                    <option key={field.id} value={field.id}>
                      {getSubmissionFieldLabel(field)}
                    </option>
                  ))}
                </select>
                {stateValueFieldBlocks.length === 0 ? (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                    Turn on Editable in app for a Text block on this page first.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="grid gap-2">
                <FieldLabel>New value</FieldLabel>
                <TextInput placeholder="Value to set when tapped" {...register('action.value.value')} />
              </div>
            )}
            {pageStateVariables.length === 0 ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                Add a page variable in the left sidebar before configuring this action.
              </p>
            ) : (
              <p className="text-xs text-slate-500">The value changes for this preview session and resets when the page reloads.</p>
            )}
          </>
        ) : null}
      </FormSection>
    );
  }

  function renderDataFieldControls() {
    return (
      <div className="grid gap-2">
        <FieldLabel>Data field name</FieldLabel>
        <TextInput placeholder="Automatically uses the label" {...register('fieldKey')} />
        <p className="text-xs text-slate-500">Buttons choose this field from their own Submit Data settings.</p>
      </div>
    );
  }

  function updateSubmitField(fieldBlockId: string, selected: boolean) {
    const currentValue = getValues('action.fields');
    const current = Array.isArray(currentValue) ? currentValue as SubmitDataFieldRef[] : [];
    const next = selected
      ? current.some((field) => field.fieldBlockId === fieldBlockId)
        ? current
        : [...current, { fieldBlockId }]
      : current.filter((field) => field.fieldBlockId !== fieldBlockId);
    setValue('action.fields', next, { shouldDirty: true });
  }

  function updateSubmitFieldTarget(fieldBlockId: string, targetFieldKey: string) {
    const currentValue = getValues('action.fields');
    const current = Array.isArray(currentValue) ? currentValue as SubmitDataFieldRef[] : [];
    setValue('action.fields', current.map((field) => (
      field.fieldBlockId === fieldBlockId
        ? { fieldBlockId, ...(targetFieldKey ? { targetFieldKey } : {}) }
        : field
    )), { shouldDirty: true });
  }

  function clearSubmitFieldTargets() {
    const currentValue = getValues('action.fields');
    const current = Array.isArray(currentValue) ? currentValue as SubmitDataFieldRef[] : [];
    setValue('action.fields', current.map((field) => ({ fieldBlockId: field.fieldBlockId })), { shouldDirty: true });
  }

  function candidateTextFits(nextText: string) {
    if (!block || typeof document === 'undefined') return true;

    const contentNode = Array.from(document.querySelectorAll<HTMLElement>('[data-editor-block-content]'))
      .find((node) => node.dataset.editorBlockContent === block.id);
    if (!contentNode) return true;

    const clone = contentNode.cloneNode(true) as HTMLElement;
    const renderedRoot = clone.firstElementChild as HTMLElement | null;
    const textNode = block.type === 'button'
      ? renderedRoot?.querySelector<HTMLElement>('button')
      : block.type === 'text'
        ? renderedRoot?.querySelector<HTMLElement>('p')
        : block.type === 'badge'
          ? renderedRoot?.querySelector<HTMLElement>('span')
          : block.type === 'toggle'
            ? renderedRoot?.lastElementChild as HTMLElement | null
            : renderedRoot?.querySelector<HTMLElement>('div');
    if (!textNode) return true;

    textNode.textContent = nextText;
    Object.assign(clone.style, {
      position: 'fixed',
      left: '-10000px',
      top: '0',
      visibility: 'hidden',
      pointerEvents: 'none',
      transform: 'none',
      width: `${contentNode.clientWidth}px`,
      maxWidth: `${contentNode.clientWidth}px`,
      height: `${contentNode.clientHeight}px`,
    });

    document.body.appendChild(clone);
    const measuredNodes = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))];
    const fits = measuredNodes.every((node) =>
      node.scrollWidth <= node.clientWidth + 1 && node.scrollHeight <= node.clientHeight + 6,
    );
    clone.remove();
    return fits;
  }

  function registerLiveText(field: 'value' | 'headline' | 'label' | 'text') {
    const registration = register(field);
    return {
      ...registration,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const previousValue = String(getValues(field) ?? '');
        const nextValue = event.currentTarget.value;
        const isShrinking = nextValue.length < previousValue.length;

        if (!isShrinking && !candidateTextFits(nextValue)) {
          event.currentTarget.value = previousValue;
          return;
        }

        registration.onChange(event);
        const nextProps = { ...(block!.props as Record<string, any>), ...getValues(), [field]: nextValue };
        previewedPropsRef.current = nextProps;
        onPreview?.({ ...block!, props: nextProps });
      },
    };
  }

  function renderTextBindingControls(propertyLabel: 'text' | 'headline') {
    const selectedVariable = textBinding.source === 'pageState'
      ? pageStateVariables.find((variable) => variable.id === textBinding.variableId)
      : undefined;
    const selectedCollection = textBinding.source === 'collection'
      ? dataCollections.find((collection) => collection.id === textBinding.collectionId)
      : undefined;
    const selectedField = textBinding.source === 'collection'
      ? selectedCollection?.fields.find((field) => field.id === textBinding.fieldId)
      : undefined;
    const selectedRecord = textBinding.source === 'collection' && textBinding.recordMode === 'specific'
      ? bindingRecords.find((record) => record.id === textBinding.recordId)
      : undefined;
    const hasMissingVariable = textBinding.source === 'pageState' && Boolean(textBinding.variableId && !selectedVariable);
    const hasMissingCollection = textBinding.source === 'collection' && Boolean(textBinding.collectionId && !selectedCollection);
    const hasMissingField = textBinding.source === 'collection' && Boolean(textBinding.fieldId && !selectedField);
    const hasMissingRecord = textBinding.source === 'collection'
      && textBinding.recordMode === 'specific'
      && Boolean(textBinding.recordId)
      && !bindingRecordsLoading
      && !bindingRecordsError
      && !selectedRecord;

    return (
      <FormSection title="Data binding" description={`Choose where this ${propertyLabel} gets its value at runtime.`}>
        <div className="grid gap-2">
          <FieldLabel>Value source</FieldLabel>
          <select
            className="inspector-input"
            value={textBinding.source}
            onChange={(event) => {
              const source = event.target.value;
              if (source === 'pageState') {
                setTextBinding({ source, variableId: pageStateVariables[0]?.id || '' });
                setTextBindingError(null);
              } else if (source === 'collection') {
                const collection = dataCollections[0];
                setTextBinding({
                  source,
                  collectionId: collection?.id || '',
                  fieldId: collection?.fields[0]?.id || '',
                  recordMode: 'latest',
                  recordId: '',
                });
                setTextBindingError(null);
              } else {
                setTextBinding({ source: 'static' });
                setTextBindingError(null);
              }
            }}
          >
            <option value="static">Static content</option>
            <option value="pageState">Page variable</option>
            <option value="collection">Collection data</option>
          </select>
        </div>
        {textBinding.source === 'pageState' ? (
          <div className="grid gap-2">
            <FieldLabel>Page variable</FieldLabel>
            <select
              className="inspector-input"
              value={textBinding.variableId}
              onChange={(event) => setTextBinding({ source: 'pageState', variableId: event.target.value })}
            >
              <option value="">Select a variable...</option>
              {hasMissingVariable ? <option value={textBinding.variableId}>Missing page variable</option> : null}
              {pageStateVariables.map((variable) => (
                <option key={variable.id} value={variable.id}>{variable.name || 'Unnamed variable'}</option>
              ))}
            </select>
          </div>
        ) : null}
        {textBinding.source === 'collection' ? (
          <>
            <div className="grid gap-2">
              <FieldLabel>Collection</FieldLabel>
              <select
                className="inspector-input"
                value={textBinding.collectionId}
                onChange={(event) => {
                  const collectionId = event.target.value;
                  const collection = dataCollections.find((candidate) => candidate.id === collectionId);
                  setTextBinding({
                    source: 'collection',
                    collectionId,
                    fieldId: collection?.fields[0]?.id || '',
                    recordMode: 'latest',
                    recordId: '',
                  });
                  setTextBindingError(null);
                }}
              >
                <option value="">Select a collection...</option>
                {hasMissingCollection ? <option value={textBinding.collectionId}>Missing collection</option> : null}
                {dataCollections.map((collection) => (
                  <option key={collection.id} value={collection.id}>{collection.name || 'Unnamed collection'}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <FieldLabel>Record</FieldLabel>
              <select
                className="inspector-input"
                value={textBinding.recordMode}
                onChange={(event) => {
                  const recordMode = event.target.value === 'specific' ? 'specific' : 'latest';
                  setTextBinding({
                    ...textBinding,
                    recordMode,
                    recordId: recordMode === 'specific' ? textBinding.recordId : '',
                  });
                  setTextBindingError(null);
                }}
                disabled={!selectedCollection}
              >
                <option value="latest">Latest record</option>
                <option value="specific">Specific record</option>
              </select>
            </div>
            {textBinding.recordMode === 'specific' ? (
              <div className="grid gap-2">
                <FieldLabel>Specific record</FieldLabel>
                <select
                  className="inspector-input"
                  value={textBinding.recordId}
                  onChange={(event) => {
                    setTextBinding({ ...textBinding, recordId: event.target.value });
                    setTextBindingError(null);
                  }}
                  disabled={!selectedCollection || bindingRecordsLoading || Boolean(bindingRecordsError)}
                >
                  <option value="">{bindingRecordsLoading ? 'Loading records...' : 'Select a record...'}</option>
                  {hasMissingRecord ? <option value={textBinding.recordId}>Missing record ({textBinding.recordId})</option> : null}
                  {bindingRecords.map((record) => (
                    <option key={record.id} value={record.id}>
                      {formatBindingRecordOption(record, selectedCollection)}
                    </option>
                  ))}
                </select>
                {!bindingRecordsLoading && !bindingRecordsError && bindingRecords.length === 0 ? (
                  <p className="text-xs text-slate-500">This collection does not have any records yet.</p>
                ) : null}
                {bindingRecordsError ? <p className="text-xs font-medium text-red-600">{bindingRecordsError}</p> : null}
                {hasMissingRecord ? (
                  <p className="text-xs font-medium text-red-600">The saved record no longer exists. Choose another record.</p>
                ) : null}
              </div>
            ) : null}
            <div className="grid gap-2">
              <FieldLabel>Collection field</FieldLabel>
              <select
                className="inspector-input"
                value={textBinding.fieldId}
                onChange={(event) => setTextBinding({
                  ...textBinding,
                  fieldId: event.target.value,
                })}
                disabled={!selectedCollection}
              >
                <option value="">Select a field...</option>
                {hasMissingField ? <option value={textBinding.fieldId}>Missing collection field</option> : null}
                {(selectedCollection?.fields || []).map((field) => (
                  <option key={field.id} value={field.id}>{field.label || field.key}</option>
                ))}
              </select>
            </div>
            {selectedCollection && !selectedCollection.publicRead ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                Enable public reads for this collection before testing the binding in web or Android preview.
              </p>
            ) : null}
            {textBindingError ? <p className="text-xs font-medium text-red-600">{textBindingError}</p> : null}
          </>
        ) : null}
        {selectedVariable ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            Preview value: <strong>{selectedVariable.initialValue || '(empty)'}</strong>
          </div>
        ) : null}
        {hasMissingVariable ? (
          <p className="text-xs font-medium text-red-600">The saved variable no longer exists. Choose another variable or switch to static content.</p>
        ) : null}
        {textBinding.source === 'collection' && (hasMissingCollection || hasMissingField) ? (
          <p className="text-xs font-medium text-red-600">The saved collection or field no longer exists. Choose another value or switch to static content.</p>
        ) : null}
        {textBinding.source === 'pageState' && pageStateVariables.length === 0 ? (
          <p className="text-xs text-slate-500">Create a text variable in Page Data on the left before adding a binding.</p>
        ) : null}
        {textBinding.source === 'collection' && dataCollections.length === 0 ? (
          <p className="text-xs text-slate-500">Create a collection in the Data workspace before adding this binding.</p>
        ) : null}
        {textBinding.source === 'collection' && selectedCollection && !selectedCollection.publicRead ? (
          <p className="text-xs text-amber-700">Turn on "Show records inside the app" for this collection before previewing live data.</p>
        ) : null}
      </FormSection>
    );
  }

  function registerLiveContainerStyle(field: 'backgroundColor' | 'borderColor' | 'borderWidth' | 'borderRadius' | 'opacity') {
    const registration = register(field);
    return {
      ...registration,
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        registration.onChange(event);
        const rawValue = event.currentTarget.value;
        const parsedValue =
          field === 'borderWidth' || field === 'borderRadius' || field === 'opacity'
            ? Number(rawValue)
            : rawValue;
        const nextProps = {
          ...(block!.props as Record<string, any>),
          ...getValues(),
          [field]: Number.isNaN(parsedValue) ? 0 : parsedValue,
        };
        previewedPropsRef.current = nextProps;
        onPreview?.({ ...block!, props: nextProps });
      },
    };
  }

  function setImageSource(src: string) {
    setValue('src', src, { shouldDirty: true, shouldTouch: true });
    const nextProps = { ...(block!.props as Record<string, any>), ...getValues(), src };
    previewedPropsRef.current = nextProps;
    onPreview?.({ ...block!, props: nextProps });
  }

  function readImageAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== 'string') {
          reject(new Error('Could not read image file.'));
          return;
        }
        resolve(reader.result);
      };
      reader.onerror = () => reject(new Error('Could not read image file.'));
      reader.readAsDataURL(file);
    });
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file.');
      return;
    }

    setImageUploadError(null);
    setIsUploadingImage(true);
    try {
      if (projectId && /^[0-9a-f]{24}$/i.test(projectId)) {
        const uploaded = await uploadProjectImage(projectId, file);
        setImageSource(uploaded.url);
        return;
      }

      const dataUrl = await readImageAsDataUrl(file);
      setImageSource(dataUrl);
    } catch (error: any) {
      setImageUploadError(error?.message || 'Image upload failed.');
    } finally {
      setIsUploadingImage(false);
    }
  }

  const placement = getBlockEditorPlacement(block);
  const rawScaleX = Number(placement.scaleX ?? 1);
  const rawScaleY = Number(placement.scaleY ?? 1);
  const hasCustomScale = Math.abs(rawScaleX - 1) > 0.001 || Math.abs(rawScaleY - 1) > 0.001;
  const supportsContentScaling = block!.type === 'hero' || block!.type === 'text' || block!.type === 'button';
  const resizeBehavior = block!.layout?.resizeBehavior ?? 'boxOnly';
  const isParentBlock = block!.type === 'container' || block!.type === 'form';
  const isEditingThisContainer = isParentBlock && activeContainerId === block!.id;

  function setResizeBehavior(nextBehavior: 'boxOnly' | 'scaleContent') {
    const grid = block!.layout?.grid;
    const currentContentScale = getBlockContentScale(block!);
    const nextProps = { ...(block!.props as Record<string, any>) };

    if (nextBehavior === 'boxOnly' && resizeBehavior === 'scaleContent' && Math.abs(currentContentScale - 1) > 0.001) {
      if (block!.type === 'hero') {
        nextProps.headlineSize = Math.round((Number(nextProps.headlineSize ?? 28) || 28) * currentContentScale);
        nextProps.contentPadding = Math.round((Number(nextProps.contentPadding ?? 16) || 16) * currentContentScale);
      }
      if (block!.type === 'text') {
        nextProps.fontSize = Math.round((Number(nextProps.fontSize ?? 16) || 16) * currentContentScale);
        nextProps.contentPadding = Math.round((Number(nextProps.contentPadding ?? 12) || 12) * currentContentScale);
      }
      if (block!.type === 'button') {
        nextProps.fontSize = Math.round((Number(nextProps.fontSize ?? 14) || 14) * currentContentScale);
        nextProps.contentPadding = Math.round((Number(nextProps.contentPadding ?? 12) || 12) * currentContentScale);
        nextProps.buttonPaddingX = Math.round((Number(nextProps.buttonPaddingX ?? 14) || 14) * currentContentScale);
        nextProps.buttonPaddingY = Math.round((Number(nextProps.buttonPaddingY ?? 10) || 10) * currentContentScale);
        nextProps.borderRadius = Math.round((Number(nextProps.borderRadius ?? 10) || 10) * currentContentScale);
      }
    }

    const nextLayout = {
      ...(block!.layout || {}),
      resizeBehavior: nextBehavior,
      scaleBase:
        nextBehavior === 'scaleContent'
          ? block!.layout?.scaleBase ?? (grid ? { colSpan: grid.colSpan, rowSpan: grid.rowSpan } : undefined)
          : undefined,
    };

    onSave?.({ ...block!, props: nextProps, layout: nextLayout });
  }
  return (
    <div className="grid gap-4">
      <div className="editor-section">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="editor-section-title">Selected block</div>
            <h4 className="mt-1 text-xl font-semibold text-slate-900">{block.type}</h4>
            <p className="mt-1 text-sm text-slate-500">Block ID: {block.id}</p>
            <p className="mt-1 text-sm text-slate-500">Width scale: {rawScaleX.toFixed(2)}x</p>
            <p className="mt-1 text-sm text-slate-500">Height scale: {rawScaleY.toFixed(2)}x</p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {hasCustomScale ? (
              <button
                type="button"
                className="ghost-btn !px-3 !py-2 text-xs font-semibold"
                onClick={() => {
                  const nextProps = { ...(block.props as Record<string, any>) };
                  delete nextProps.scale;
                  delete nextProps.scaleX;
                  delete nextProps.scaleY;
                  delete nextProps.x;
                  delete nextProps.y;
                  const nextEditorPlacement = { ...(block.editorPlacement || {}) };
                  delete nextEditorPlacement.scale;
                  delete nextEditorPlacement.scaleX;
                  delete nextEditorPlacement.scaleY;
                  onSave?.({ ...block, props: nextProps, editorPlacement: nextEditorPlacement });
                }}
              >
                Reset Size
              </button>
            ) : null}
            <button className="ghost-btn !px-3 !py-2 text-xs font-semibold" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>

      {supportsContentScaling ? (
        <FormSection
          title="Resize behavior"
          description="Choose whether resizing changes only the grid box or scales the content inside it too."
        >
          <div className="grid gap-2">
            <button
              type="button"
              className={`ghost-btn !justify-start !px-4 !py-3 text-left text-sm ${
                resizeBehavior === 'boxOnly' ? '!bg-slate-900 !text-white' : ''
              }`}
              onClick={() => setResizeBehavior('boxOnly')}
            >
              Box only
            </button>
            <button
              type="button"
              className={`ghost-btn !justify-start !px-4 !py-3 text-left text-sm ${
                resizeBehavior === 'scaleContent' ? '!bg-slate-900 !text-white' : ''
              }`}
              onClick={() => setResizeBehavior('scaleContent')}
            >
              Scale content with box
            </button>
          </div>
          {resizeBehavior === 'scaleContent' && block.layout?.scaleBase ? (
            <p className="text-xs text-slate-500">
              1x base: {block.layout.scaleBase.colSpan} columns x {block.layout.scaleBase.rowSpan} rows.
            </p>
          ) : null}
        </FormSection>
      ) : null}
      {isParentBlock ? (
        <FormSection
          title={`${block.type === 'form' ? 'Form' : 'Container'} contents`}
          description={
            block.type === 'form'
              ? 'Click Edit contents, then add editable Text, Checkbox, or Toggle blocks from the left sidebar.'
              : 'Click Edit contents, then click blocks in the left sidebar. New blocks will be placed inside this container until you exit.'
          }
        >
          <div className="grid gap-2">
            {isEditingThisContainer ? (
              <>
                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm text-blue-900">
                  {block.type === 'form' ? 'Form editing' : 'Container editing'} is active. Use the left sidebar to add child blocks here.
                </div>
                <button type="button" className="ghost-btn !justify-start !px-4 !py-3 text-left text-sm" onClick={onExitContainer}>
                  Exit container editing
                </button>
              </>
            ) : (
              <button type="button" className="btn" onClick={() => onEditContainer?.(block)}>
                Edit contents
              </button>
            )}
          </div>
        </FormSection>
      ) : null}
      {block.parentId ? (
        <FormSection
          title="Container membership"
          description="This block is inside a container. Moving it to the page will place it in the first open page-grid position."
        >
          <button type="button" className="ghost-btn !justify-start !px-4 !py-3 text-left text-sm" onClick={() => onDetachBlock?.(block)}>
            Move block to page
          </button>
        </FormSection>
      ) : null}
      <form onSubmit={handleSubmit(submit)} className="grid gap-4">
        {isParentBlock && (
          <FormSection
            title={`${block.type === 'form' ? 'Form' : 'Container'} style`}
            description={
              block.type === 'form'
                ? 'Style the form surface and submit area. Child fields keep their own styles.'
                : 'Containers are transparent by default. Add a surface only when it helps structure the screen.'
            }
          >
            {block.type === 'form' ? (
              <>
                <div className="grid gap-2">
                  <FieldLabel>Title</FieldLabel>
                  <TextInput {...register('title')} />
                </div>
                <div className="grid gap-2">
                  <FieldLabel>Description</FieldLabel>
                  <TextArea rows={3} {...register('description')} />
                </div>
                <div className="grid gap-2">
                  <FieldLabel>Submit label</FieldLabel>
                  <TextInput {...register('submitLabel')} />
                </div>
                <div className="grid gap-2">
                  <FieldLabel>Success message</FieldLabel>
                  <TextInput {...register('successMessage')} />
                </div>
                <div className="grid gap-2">
                  <FieldLabel>Content padding (px)</FieldLabel>
                  <TextInput type="number" min={0} className="max-w-[120px]" {...register('contentPadding')} />
                </div>
              </>
            ) : null}
            <div className="grid gap-2">
              <FieldLabel>Background color</FieldLabel>
              <TextInput placeholder="transparent or #ffffff" {...registerLiveContainerStyle('backgroundColor')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Border color</FieldLabel>
              <TextInput placeholder="transparent or #2563eb" {...registerLiveContainerStyle('borderColor')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Border width (px)</FieldLabel>
              <TextInput type="number" min={0} className="max-w-[120px]" {...registerLiveContainerStyle('borderWidth')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Corner radius (px)</FieldLabel>
              <TextInput type="number" min={0} className="max-w-[120px]" {...registerLiveContainerStyle('borderRadius')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Opacity</FieldLabel>
              <TextInput type="number" min={0} max={1} step={0.05} className="max-w-[120px]" {...registerLiveContainerStyle('opacity')} />
            </div>
          </FormSection>
        )}

        {block.type === 'text' && (
          <>
            {renderTextBindingControls('text')}
            <FormSection title="Content" description="Set the displayed text or the starting value used by an editable field.">
              <div className="grid gap-2">
                <FieldLabel>Text</FieldLabel>
                <TextArea {...registerLiveText('value')} />
              </div>
              <div className="grid gap-2">
                <FieldLabel>Font size (px)</FieldLabel>
                <TextInput type="number" className="max-w-[120px]" {...register('fontSize')} />
              </div>
              <div className="grid gap-2">
                <FieldLabel>Text color</FieldLabel>
                <TextInput type="color" className="h-12 max-w-[120px] p-1" {...register('textColor')} />
              </div>
            </FormSection>
            <FormSection title="App input" description="Optionally let app users edit this text and expose its value to actions and submissions.">
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-3 text-sm text-slate-800">
                <ToggleInput type="checkbox" {...register('editable')} />
                Editable in app
              </label>
              {textEditable ? (
                <>
                  <div className="grid gap-2">
                    <FieldLabel>Field label</FieldLabel>
                    <TextInput {...register('fieldLabel')} />
                    <p className="text-xs text-slate-500">Used in submission records and validation messages.</p>
                  </div>
                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-3 text-sm text-slate-800">
                    <ToggleInput type="checkbox" {...register('showFieldLabel')} />
                    Show field label
                  </label>
                  {renderDataFieldControls()}
                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-3 text-sm text-slate-800">
                    <ToggleInput type="checkbox" {...register('required')} />
                    Required when submitted
                  </label>
                  <div className="grid gap-2">
                    <FieldLabel>Input mode</FieldLabel>
                    <select className="inspector-input" {...register('textInputMode')}>
                      <option value="singleLine">Single line</option>
                      <option value="multiline">Multiple lines</option>
                    </select>
                  </div>
                  {textInputMode !== 'multiline' ? (
                    <div className="grid gap-2">
                      <FieldLabel>Keyboard type</FieldLabel>
                      <select className="inspector-input" {...register('inputType')}>
                        <option value="text">Text</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="number">Number</option>
                        <option value="password">Password</option>
                      </select>
                    </div>
                  ) : null}
                  <div className="grid gap-2">
                    <FieldLabel>Placeholder</FieldLabel>
                    <TextInput {...register('placeholder')} />
                  </div>
                  <div className="grid gap-2">
                    <FieldLabel>Background color</FieldLabel>
                    <TextInput type="color" className="h-12 max-w-[120px] p-1" {...register('backgroundColor')} />
                  </div>
                  <div className="grid gap-2">
                    <FieldLabel>Placeholder color</FieldLabel>
                    <TextInput type="color" className="h-12 max-w-[120px] p-1" {...register('placeholderColor')} />
                  </div>
                  <div className="grid gap-2">
                    <FieldLabel>Border color</FieldLabel>
                    <TextInput type="color" className="h-12 max-w-[120px] p-1" {...register('borderColor')} />
                  </div>
                  <div className="grid gap-2">
                    <FieldLabel>Border width (px)</FieldLabel>
                    <TextInput type="number" min={0} className="max-w-[120px]" {...register('borderWidth')} />
                  </div>
                  <div className="grid gap-2">
                    <FieldLabel>Corner radius (px)</FieldLabel>
                    <TextInput type="number" min={0} className="max-w-[120px]" {...register('borderRadius')} />
                  </div>
                  <p className="text-xs leading-5 text-slate-500">
                    A Form submits editable Text children automatically. A Submit Data button can select editable Text blocks from its field list.
                  </p>
                </>
              ) : (
                <p className="text-xs leading-5 text-slate-500">This block only displays its static or bound value.</p>
              )}
            </FormSection>
          </>
        )}

        {block.type === 'hero' && (
          <>
            {renderTextBindingControls('headline')}
            <FormSection title="Hero copy" description="Control the static headline or fallback shown when a bound value is unavailable.">
              <div className="grid gap-2">
                <FieldLabel>Headline</FieldLabel>
                <TextInput {...registerLiveText('headline')} />
              </div>
              <div className="grid gap-2">
                <FieldLabel>Headline size (px)</FieldLabel>
                <TextInput type="number" className="max-w-[120px]" {...register('headlineSize')} />
              </div>
            </FormSection>
          </>
        )}

        {block.type === 'button' && (
          <>
            <FormSection title="Button" description="Set the label and choose what happens when this button is tapped.">
              <div className="grid gap-2">
                <FieldLabel>Label</FieldLabel>
                <TextInput {...registerLiveText('label')} />
              </div>
            </FormSection>
            {renderActionControls(true)}
            <FormSection title="Button style" description="Tune the button appearance without changing its action.">
              <div className="grid gap-2">
                <FieldLabel>Font size (px)</FieldLabel>
                <TextInput type="number" min={8} className="max-w-[120px]" {...register('fontSize')} />
              </div>
              <div className="grid gap-2">
                <FieldLabel>Background color</FieldLabel>
                <TextInput type="color" className="h-12 max-w-[120px] p-1" {...register('backgroundColor')} />
              </div>
              <div className="grid gap-2">
                <FieldLabel>Text color</FieldLabel>
                <TextInput type="color" className="h-12 max-w-[120px] p-1" {...register('textColor')} />
              </div>
              <div className="grid gap-2">
                <FieldLabel>Corner radius (px)</FieldLabel>
                <TextInput type="number" min={0} className="max-w-[120px]" {...register('borderRadius')} />
              </div>
              <div className="grid gap-2">
                <FieldLabel>Button padding X (px)</FieldLabel>
                <TextInput type="number" min={0} className="max-w-[120px]" {...register('buttonPaddingX')} />
              </div>
              <div className="grid gap-2">
                <FieldLabel>Button padding Y (px)</FieldLabel>
                <TextInput type="number" min={0} className="max-w-[120px]" {...register('buttonPaddingY')} />
              </div>
              <div className="grid gap-2">
                <FieldLabel>Outer padding (px)</FieldLabel>
                <TextInput type="number" min={0} className="max-w-[120px]" {...register('contentPadding')} />
              </div>
            </FormSection>
          </>
        )}

        {block.type === 'shape' && (
          <FormSection title="Shape" description="Style this visual block without adding text or image assets.">
            <div className="grid gap-2">
              <FieldLabel>Shape type</FieldLabel>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold capitalize text-slate-700">
                {block.props.shapeType || 'rectangle'}
              </div>
            </div>
            <div className="grid gap-2">
              <FieldLabel>Fill color</FieldLabel>
              <TextInput type="color" className="h-12 max-w-[120px] p-1" {...register('fillColor')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Border color</FieldLabel>
              <TextInput type="color" className="h-12 max-w-[120px] p-1" {...register('borderColor')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Border width (px)</FieldLabel>
              <TextInput type="number" min={0} className="max-w-[120px]" {...register('borderWidth')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Corner radius (px)</FieldLabel>
              <TextInput type="number" min={0} className="max-w-[120px]" {...register('borderRadius')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Opacity</FieldLabel>
              <TextInput type="number" min={0} max={1} step={0.05} className="max-w-[120px]" {...register('opacity')} />
            </div>
          </FormSection>
        )}

        {block.type === 'badge' && (
          <FormSection title="Badge" description="Create a compact status label or tag.">
            <div className="grid gap-2">
              <FieldLabel>Text</FieldLabel>
              <TextInput {...registerLiveText('text')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Font size (px)</FieldLabel>
              <TextInput type="number" min={8} className="max-w-[120px]" {...register('fontSize')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Background color</FieldLabel>
              <TextInput type="color" className="h-12 max-w-[120px] p-1" {...register('backgroundColor')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Text color</FieldLabel>
              <TextInput type="color" className="h-12 max-w-[120px] p-1" {...register('textColor')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Border color</FieldLabel>
              <TextInput type="color" className="h-12 max-w-[120px] p-1" {...register('borderColor')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Corner radius (px)</FieldLabel>
              <TextInput type="number" min={0} className="max-w-[120px]" {...register('borderRadius')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Padding X (px)</FieldLabel>
              <TextInput type="number" min={0} className="max-w-[120px]" {...register('paddingX')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Padding Y (px)</FieldLabel>
              <TextInput type="number" min={0} className="max-w-[120px]" {...register('paddingY')} />
            </div>
          </FormSection>
        )}

        {block.type === 'icon' && (
          <>
            <FormSection title="Icon" description="Pick a simple native-safe symbol.">
              <div className="grid gap-2">
                <FieldLabel>Icon</FieldLabel>
                <select className="inspector-input" {...register('iconName')}>
                  <option value="star">Star</option>
                  <option value="check">Check</option>
                  <option value="home">Home</option>
                  <option value="search">Search</option>
                  <option value="user">User</option>
                  <option value="heart">Heart</option>
                  <option value="bell">Bell</option>
                  <option value="plus">Plus</option>
                  <option value="arrow">Arrow</option>
                </select>
              </div>
              <div className="grid gap-2">
                <FieldLabel>Size (px)</FieldLabel>
                <TextInput type="number" min={8} className="max-w-[120px]" {...register('fontSize')} />
              </div>
              <div className="grid gap-2">
                <FieldLabel>Icon color</FieldLabel>
                <TextInput type="color" className="h-12 max-w-[120px] p-1" {...register('color')} />
              </div>
              <div className="grid gap-2">
                <FieldLabel>Background color</FieldLabel>
                <TextInput type="color" className="h-12 max-w-[120px] p-1" {...register('backgroundColor')} />
              </div>
              <div className="grid gap-2">
                <FieldLabel>Corner radius (px)</FieldLabel>
                <TextInput type="number" min={0} className="max-w-[120px]" {...register('borderRadius')} />
              </div>
            </FormSection>
            {renderActionControls()}
          </>
        )}

        {block.type === 'checkbox' && (
          <FormSection title="Checkbox" description="A boolean field that a Submit Data button can include.">
            <div className="grid gap-2">
              <FieldLabel>Label</FieldLabel>
              <TextInput {...register('label')} />
            </div>
            {renderDataFieldControls()}
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-3 text-sm text-slate-800">
              <ToggleInput type="checkbox" {...register('required')} />
              Required in forms
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-3 text-sm text-slate-800">
              <ToggleInput type="checkbox" {...register('checked')} />
              Checked
            </label>
            <div className="grid gap-2">
              <FieldLabel>Font size (px)</FieldLabel>
              <TextInput type="number" min={8} className="max-w-[120px]" {...register('fontSize')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Text color</FieldLabel>
              <TextInput type="color" className="h-12 max-w-[120px] p-1" {...register('textColor')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Box color</FieldLabel>
              <TextInput type="color" className="h-12 max-w-[120px] p-1" {...register('boxColor')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Check color</FieldLabel>
              <TextInput type="color" className="h-12 max-w-[120px] p-1" {...register('checkColor')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Border color</FieldLabel>
              <TextInput type="color" className="h-12 max-w-[120px] p-1" {...register('borderColor')} />
            </div>
          </FormSection>
        )}

        {block.type === 'toggle' && (
          <FormSection title="Toggle" description="A boolean field that a Submit Data button can include.">
            <div className="grid gap-2">
              <FieldLabel>Label</FieldLabel>
              <TextInput {...registerLiveText('label')} />
            </div>
            {renderDataFieldControls()}
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-3 text-sm text-slate-800">
              <ToggleInput type="checkbox" {...register('required')} />
              Required in forms
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-3 text-sm text-slate-800">
              <ToggleInput type="checkbox" {...register('checked')} />
              On
            </label>
            <div className="grid gap-2">
              <FieldLabel>Font size (px)</FieldLabel>
              <TextInput type="number" min={8} className="max-w-[120px]" {...register('fontSize')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Text color</FieldLabel>
              <TextInput type="color" className="h-12 max-w-[120px] p-1" {...register('textColor')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Active color</FieldLabel>
              <TextInput type="color" className="h-12 max-w-[120px] p-1" {...register('activeColor')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Inactive color</FieldLabel>
              <TextInput type="color" className="h-12 max-w-[120px] p-1" {...register('inactiveColor')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Knob color</FieldLabel>
              <TextInput type="color" className="h-12 max-w-[120px] p-1" {...register('knobColor')} />
            </div>
          </FormSection>
        )}

        {block.type === 'progressBar' && (
          <FormSection title="Progress Bar" description="Show simple visual progress or completion state.">
            <div className="grid gap-2">
              <FieldLabel>Label</FieldLabel>
              <TextInput {...register('label')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Value (%)</FieldLabel>
              <TextInput type="number" min={0} max={100} className="max-w-[120px]" {...register('value')} />
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-3 text-sm text-slate-800">
              <ToggleInput type="checkbox" {...register('showLabel')} />
              Show label
            </label>
            <div className="grid gap-2">
              <FieldLabel>Track color</FieldLabel>
              <TextInput type="color" className="h-12 max-w-[120px] p-1" {...register('trackColor')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Fill color</FieldLabel>
              <TextInput type="color" className="h-12 max-w-[120px] p-1" {...register('fillColor')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Text color</FieldLabel>
              <TextInput type="color" className="h-12 max-w-[120px] p-1" {...register('textColor')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Corner radius (px)</FieldLabel>
              <TextInput type="number" min={0} className="max-w-[120px]" {...register('borderRadius')} />
            </div>
          </FormSection>
        )}

        {block.type === 'image' && (
          <>
            <FormSection title="Image source" description="Upload an image from your device or paste an image URL. Saved projects upload files to asset storage and keep the returned URL in the block schema.">
              <div className="grid gap-2">
                <FieldLabel>Upload image</FieldLabel>
                <input
                  type="file"
                  accept="image/*"
                  className="inspector-input file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                  onChange={handleImageUpload}
                  disabled={isUploadingImage}
                />
                {isUploadingImage ? <p className="text-xs text-slate-500">Uploading image...</p> : null}
                {imageUploadError ? <p className="text-xs font-semibold text-red-600">{imageUploadError}</p> : null}
              </div>
              <div className="grid gap-2">
                <FieldLabel>Image URL or data URL</FieldLabel>
                <TextArea rows={4} placeholder="https://example.com/image.jpg" {...register('src')} />
              </div>
              <div className="grid gap-2">
                <FieldLabel>Alt text</FieldLabel>
                <TextInput placeholder="Describe this image" {...register('alt')} />
              </div>
              <button
                type="button"
                className="ghost-btn !justify-start !px-4 !py-3 text-left text-sm"
                onClick={() => setImageSource('')}
              >
                Clear image
              </button>
            </FormSection>

            <FormSection title="Image display" description="Control how the image fills its block. Cover crops, contain preserves the full image, and fill stretches.">
              <div className="grid gap-2">
                <FieldLabel>Fit mode</FieldLabel>
                <select className="inspector-input" {...register('fit')}>
                  <option value="cover">Cover</option>
                  <option value="contain">Contain</option>
                  <option value="fill">Fill</option>
                </select>
              </div>
              <div className="grid gap-2">
                <FieldLabel>Horizontal focus (%)</FieldLabel>
                <TextInput type="number" min={0} max={100} className="max-w-[120px]" {...register('positionX')} />
              </div>
              <div className="grid gap-2">
                <FieldLabel>Vertical focus (%)</FieldLabel>
                <TextInput type="number" min={0} max={100} className="max-w-[120px]" {...register('positionY')} />
              </div>
              <div className="grid gap-2">
                <FieldLabel>Background color</FieldLabel>
                <TextInput type="color" className="h-12 max-w-[120px] p-1" {...register('backgroundColor')} />
              </div>
              <div className="grid gap-2">
                <FieldLabel>Border color</FieldLabel>
                <TextInput placeholder="transparent or #2563eb" {...register('borderColor')} />
              </div>
              <div className="grid gap-2">
                <FieldLabel>Border width (px)</FieldLabel>
                <TextInput type="number" min={0} className="max-w-[120px]" {...register('borderWidth')} />
              </div>
              <div className="grid gap-2">
                <FieldLabel>Corner radius (px)</FieldLabel>
                <TextInput type="number" min={0} className="max-w-[120px]" {...register('borderRadius')} />
              </div>
              <div className="grid gap-2">
                <FieldLabel>Opacity</FieldLabel>
                <TextInput type="number" min={0} max={1} step={0.05} className="max-w-[120px]" {...register('opacity')} />
              </div>
            </FormSection>
            {renderActionControls()}
          </>
        )}

        {block.type === 'servicesList' && (
          <>
            <FormSection title="Section" description="Update the intro heading for this list.">
              <div className="grid gap-2">
                <FieldLabel>Section title</FieldLabel>
                <TextInput {...register('title')} />
              </div>
            </FormSection>
            <FormSection title="Services" description="Keep entries short and scannable.">
              <div className="flex justify-end">
                <button type="button" className="btn-sm" onClick={() => servicesArray.append({ name: 'New Service', description: '', price: '' })}>
                  Add Service
                </button>
              </div>
              <div className="grid gap-3">
                {servicesArray.fields.map((field, index) => (
                  <ArrayCard key={field.id} title={`Service ${index + 1}`} onRemove={() => servicesArray.remove(index)}>
                    <div className="grid gap-2">
                      <FieldLabel>Name</FieldLabel>
                      <TextInput {...register(`items.${index}.name`)} />
                    </div>
                    <div className="grid gap-2">
                      <FieldLabel>Description</FieldLabel>
                      <TextArea rows={3} {...register(`items.${index}.description`)} />
                    </div>
                    <div className="grid gap-2">
                      <FieldLabel>Price</FieldLabel>
                      <TextInput {...register(`items.${index}.price`)} />
                    </div>
                  </ArrayCard>
                ))}
              </div>
            </FormSection>
          </>
        )}

        {block.type === 'contactForm' && (
          <>
            <FormSection title="Form copy" description="Set the messaging customers see before they submit.">
              <div className="grid gap-2">
                <FieldLabel>Title</FieldLabel>
                <TextInput {...register('title')} />
              </div>
              <div className="grid gap-2">
                <FieldLabel>Subtitle</FieldLabel>
                <TextArea rows={3} {...register('subtitle')} />
              </div>
              <div className="grid gap-2">
                <FieldLabel>Submit label</FieldLabel>
                <TextInput {...register('submitLabel')} />
              </div>
              <div className="grid gap-2">
                <FieldLabel>Success message</FieldLabel>
                <TextArea rows={3} {...register('successMessage')} />
              </div>
            </FormSection>

            <FormSection title="Lead routing" description="Notifications go to this address after a successful submission.">
              <div className="grid gap-2">
                <FieldLabel>Destination email</FieldLabel>
                <TextInput type="email" placeholder="owner@business.com" {...register('destinationEmail')} />
              </div>
            </FormSection>

            <FormSection title="Visible fields" description="Decide which inputs appear in the form.">
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-3 text-sm text-slate-800">
                <ToggleInput type="checkbox" {...register('showName')} />
                Show name field
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-3 text-sm text-slate-800">
                <ToggleInput type="checkbox" {...register('showEmail')} />
                Show email field
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-3 text-sm text-slate-800">
                <ToggleInput type="checkbox" {...register('showPhone')} />
                Show phone field
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-3 text-sm text-slate-800">
                <ToggleInput type="checkbox" {...register('showMessage')} />
                Show message field
              </label>
            </FormSection>
          </>
        )}

        {block.type === 'imageGallery' && (
          <>
            <FormSection title="Gallery settings" description="Control the gallery heading and layout density.">
              <div className="grid gap-2">
                <FieldLabel>Section title</FieldLabel>
                <TextInput {...register('title')} />
              </div>
              <div className="grid gap-2">
                <FieldLabel>Columns</FieldLabel>
                <TextInput type="number" min={1} max={3} className="max-w-[120px]" {...register('columns')} />
              </div>
            </FormSection>
            <FormSection title="Images" description="Add image URLs and short captions.">
              <div className="flex justify-end">
                <button type="button" className="btn-sm" onClick={() => galleryArray.append({ url: '', caption: 'New image' })}>
                  Add Image
                </button>
              </div>
              <div className="grid gap-3">
                {galleryArray.fields.map((field, index) => (
                  <ArrayCard key={field.id} title={`Image ${index + 1}`} onRemove={() => galleryArray.remove(index)}>
                    <div className="grid gap-2">
                      <FieldLabel>Image URL</FieldLabel>
                      <TextInput {...register(`images.${index}.url`)} />
                    </div>
                    <div className="grid gap-2">
                      <FieldLabel>Caption</FieldLabel>
                      <TextInput {...register(`images.${index}.caption`)} />
                    </div>
                  </ArrayCard>
                ))}
              </div>
            </FormSection>
          </>
        )}

        <div className="editor-section flex items-center justify-between gap-3">
          <button className="btn" type="submit">Save Changes</button>
          {onDelete ? (
            <button
                type="button"
                className="ghost-btn !text-red-700"
                onClick={() => {
                  if (block.type !== 'container' && block.type !== 'form') {
                    const ok = confirm('Delete this block?');
                    if (!ok) return;
                  }
                  onDelete(block.id);
                }}
              >
              Delete Block
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

function friendlyFieldType(type: AppDataCollection['fields'][number]['type']) {
  if (type === 'boolean') return 'Yes / No';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function isSubmissionField(block: Block) {
  return block.type === 'checkbox'
    || block.type === 'toggle'
    || (block.type === 'text' && block.props.editable === true);
}

function isBooleanSubmissionField(block: Block) {
  return block.type === 'checkbox' || block.type === 'toggle';
}

function getSubmissionFieldLabel(block: Block) {
  return String(block.props.fieldLabel || block.props.label || block.props.placeholder || block.props.value || block.type);
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

function getBindableTextProperty(block?: Block | null): 'value' | 'headline' | null {
  if (block?.type === 'text') return 'value';
  if (block?.type === 'hero') return 'headline';
  return null;
}

function getTextBindingDraft(block?: Block | null): TextBindingDraft {
  const property = getBindableTextProperty(block);
  if (!property) return { source: 'static' };
  const reference = block?.bindings?.[property];
  if (reference?.source === 'pageState') {
    return { source: 'pageState', variableId: reference.variableId };
  }
  if (reference?.source === 'collection') {
    const specificRecordId = reference.record?.mode === 'specific' ? reference.record.recordId : '';
    return {
      source: 'collection',
      collectionId: reference.collectionId,
      fieldId: reference.fieldId,
      recordMode: specificRecordId ? 'specific' : 'latest',
      recordId: specificRecordId,
    };
  }
  return { source: 'static' };
}

function formatBindingRecordOption(record: ProjectAppDataRecord, collection?: AppDataCollection) {
  const field = collection?.fields.find((candidate) => {
    const value = record.data[candidate.key];
    return typeof value === 'boolean' || (typeof value === 'string' && value.trim().length > 0);
  });
  const value = field ? record.data[field.key] : undefined;
  const displayValue = typeof value === 'boolean'
    ? (value ? 'Yes' : 'No')
    : typeof value === 'string'
      ? value.trim()
      : '';
  const summary = displayValue
    ? `${field?.label || field?.key}: ${truncateRecordValue(displayValue)}`
    : `Record ${record.id.slice(-6)}`;
  const submittedAt = new Date(record.submittedAt);
  return Number.isNaN(submittedAt.getTime()) ? summary : `${summary} - ${submittedAt.toLocaleString()}`;
}

function truncateRecordValue(value: string) {
  return value.length > 48 ? `${value.slice(0, 45)}...` : value;
}



