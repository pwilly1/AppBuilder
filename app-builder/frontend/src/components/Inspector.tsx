import React from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import type { Block } from '../shared/schema/types';
import { getBlockEditorPlacement } from '../shared/schema/runtimeLayout';
import { getBlockContentScale } from '../shared/schema/contentScale';

type PageLite = { id: string; title?: string; path?: string };

type InspectorProps = {
  block?: Block | null;
  pages?: PageLite[];
  activeContainerId?: string | null;
  onSave?: (b: Block) => void;
  onPreview?: (b: Block) => void;
  onClose?: () => void;
  onDelete?: (id: string) => void;
  onEditContainer?: (b: Block) => void;
  onExitContainer?: () => void;
  onDetachBlock?: (b: Block) => void;
};

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
  pages,
  activeContainerId,
  onSave,
  onPreview,
  onClose,
  onDelete,
  onEditContainer,
  onExitContainer,
  onDetachBlock,
}: InspectorProps) {
  const { register, control, handleSubmit, reset, getValues } = useForm<Record<string, any>>({ defaultValues: block?.props || {} });
  const servicesArray = useFieldArray({ control, name: 'items' });
  const galleryArray = useFieldArray({ control, name: 'images' });
  const previewedPropsRef = React.useRef<Record<string, any> | null>(null);

  React.useEffect(() => {
    if (previewedPropsRef.current === block?.props) {
      previewedPropsRef.current = null;
      return;
    }
    reset(block?.props || {});
  }, [block, reset]);

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
    const props = { ...(block.props as Record<string, any>), ...vals } as any;
    if (props.fontSize) props.fontSize = Number(props.fontSize);
    if (props.headlineSize) props.headlineSize = Number(props.headlineSize);
    if (props.columns) props.columns = Number(props.columns);
    if (props.thickness !== undefined) props.thickness = Number(props.thickness);
    if (props.rows !== undefined) props.rows = Number(props.rows);
    if (props.contentPadding !== undefined) props.contentPadding = Number(props.contentPadding);
    if (props.buttonPaddingX !== undefined) props.buttonPaddingX = Number(props.buttonPaddingX);
    if (props.buttonPaddingY !== undefined) props.buttonPaddingY = Number(props.buttonPaddingY);
    if (props.paddingX !== undefined) props.paddingX = Number(props.paddingX);
    if (props.paddingY !== undefined) props.paddingY = Number(props.paddingY);
    if (props.borderWidth !== undefined) props.borderWidth = Number(props.borderWidth);
    if (props.borderRadius !== undefined) props.borderRadius = Number(props.borderRadius);
    if (props.opacity !== undefined) props.opacity = Number(props.opacity);
    if (props.value !== undefined && block.type === 'progressBar') props.value = Number(props.value);
    onSave?.({ ...block, props });
  };

  function candidateTextFits(nextText: string) {
    if (!block || typeof document === 'undefined') return true;

    const contentNode = Array.from(document.querySelectorAll<HTMLElement>('[data-editor-block-content]'))
      .find((node) => node.dataset.editorBlockContent === block.id);
    if (!contentNode) return true;

    const clone = contentNode.cloneNode(true) as HTMLElement;
    const renderedRoot = clone.firstElementChild as HTMLElement | null;
    const textNode = block.type === 'navButton'
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

  const placement = getBlockEditorPlacement(block);
  const rawScaleX = Number(placement.scaleX ?? 1);
  const rawScaleY = Number(placement.scaleY ?? 1);
  const hasCustomScale = Math.abs(rawScaleX - 1) > 0.001 || Math.abs(rawScaleY - 1) > 0.001;
  const supportsContentScaling = block!.type === 'hero' || block!.type === 'text' || block!.type === 'navButton';
  const resizeBehavior = block!.layout?.resizeBehavior ?? 'boxOnly';
  const isEditingThisContainer = block!.type === 'container' && activeContainerId === block!.id;

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
      if (block!.type === 'navButton') {
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
      {block.type === 'container' ? (
        <FormSection
          title="Container contents"
          description="Click Edit contents, then click blocks in the left sidebar. New blocks will be placed inside this container until you exit."
        >
          <div className="grid gap-2">
            {isEditingThisContainer ? (
              <>
                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm text-blue-900">
                  Container editing is active. Use the left sidebar to add child blocks here.
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
        {block.type === 'container' && (
          <FormSection title="Container style" description="Containers are transparent by default. Add a surface only when it helps structure the screen.">
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
          <FormSection title="Content" description="Edit the text copy and its display size.">
            <div className="grid gap-2">
              <FieldLabel>Text</FieldLabel>
              <TextArea {...registerLiveText('value')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Font size (px)</FieldLabel>
              <TextInput type="number" className="max-w-[120px]" {...register('fontSize')} />
            </div>
          </FormSection>
        )}

        {block.type === 'hero' && (
          <FormSection title="Hero copy" description="Control the first headline users see on this page.">
            <div className="grid gap-2">
              <FieldLabel>Headline</FieldLabel>
              <TextInput {...registerLiveText('headline')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Headline size (px)</FieldLabel>
              <TextInput type="number" className="max-w-[120px]" {...register('headlineSize')} />
            </div>
          </FormSection>
        )}

        {block.type === 'navButton' && (
          <>
            <FormSection title="Navigation" description="Choose the label and where this button should take the user.">
              <div className="grid gap-2">
                <FieldLabel>Label</FieldLabel>
                <TextInput {...registerLiveText('label')} />
              </div>
              <div className="grid gap-2">
                <FieldLabel>Target page</FieldLabel>
                <select className="inspector-input" {...register('toPageId')}>
                  <option value="">Select a page...</option>
                  {(pages || []).map((page) => (
                    <option key={page.id} value={page.id}>{page.title || page.id}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-slate-500">This button switches to the selected page in preview/runtime.</p>
            </FormSection>
            <FormSection title="Button style" description="Tune the visual button without creating a separate button type.">
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
        )}

        {block.type === 'checkbox' && (
          <FormSection title="Checkbox" description="Visual-only checkbox for mockups and checklists.">
            <div className="grid gap-2">
              <FieldLabel>Label</FieldLabel>
              <TextInput {...register('label')} />
            </div>
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
          <FormSection title="Toggle" description="Visual-only on/off switch for mockups.">
            <div className="grid gap-2">
              <FieldLabel>Label</FieldLabel>
              <TextInput {...registerLiveText('label')} />
            </div>
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

        {block.type === 'input' && (
          <FormSection title="Input" description="Visual single-line field for app mockups. It is not connected to form submissions yet.">
            <div className="grid gap-2">
              <FieldLabel>Label</FieldLabel>
              <TextInput {...register('label')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Placeholder</FieldLabel>
              <TextInput {...register('placeholder')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Display value</FieldLabel>
              <TextInput {...register('value')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Input type</FieldLabel>
              <select className="inspector-input" {...register('inputType')}>
                <option value="text">Text</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="number">Number</option>
                <option value="password">Password</option>
              </select>
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
              <FieldLabel>Placeholder color</FieldLabel>
              <TextInput type="color" className="h-12 max-w-[120px] p-1" {...register('placeholderColor')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Border color</FieldLabel>
              <TextInput type="color" className="h-12 max-w-[120px] p-1" {...register('borderColor')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Corner radius (px)</FieldLabel>
              <TextInput type="number" min={0} className="max-w-[120px]" {...register('borderRadius')} />
            </div>
          </FormSection>
        )}

        {block.type === 'textarea' && (
          <FormSection title="Textarea" description="Visual multi-line field for app mockups. It is not connected to form submissions yet.">
            <div className="grid gap-2">
              <FieldLabel>Label</FieldLabel>
              <TextInput {...register('label')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Placeholder</FieldLabel>
              <TextInput {...register('placeholder')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Display value</FieldLabel>
              <TextArea rows={3} {...register('value')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Rows</FieldLabel>
              <TextInput type="number" min={1} className="max-w-[120px]" {...register('rows')} />
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
              <FieldLabel>Placeholder color</FieldLabel>
              <TextInput type="color" className="h-12 max-w-[120px] p-1" {...register('placeholderColor')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Border color</FieldLabel>
              <TextInput type="color" className="h-12 max-w-[120px] p-1" {...register('borderColor')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Corner radius (px)</FieldLabel>
              <TextInput type="number" min={0} className="max-w-[120px]" {...register('borderRadius')} />
            </div>
          </FormSection>
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
                  if (block.type !== 'container') {
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



