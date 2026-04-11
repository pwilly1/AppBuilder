// © 2025 Preston Willis. All rights reserved.
import React from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import type { Block } from '../shared/schema/types';
import { getBlockEditorPlacement } from '../shared/schema/runtimeLayout';

type PageLite = { id: string; title?: string; path?: string };

type InspectorProps = {
  block?: Block | null;
  pages?: PageLite[];
  onSave?: (b: Block) => void;
  onClose?: () => void;
  onDelete?: (id: string) => void;
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

export default function Inspector({ block, pages, onSave, onClose, onDelete }: InspectorProps) {
  const { register, control, handleSubmit, reset } = useForm({ defaultValues: block?.props || {} });
  const servicesArray = useFieldArray({ control, name: 'items' });
  const galleryArray = useFieldArray({ control, name: 'images' });

  React.useEffect(() => {
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
    onSave?.({ ...block, props });
  };

  const placement = getBlockEditorPlacement(block);
  const rawScaleX = Number(placement.scaleX ?? 1);
  const rawScaleY = Number(placement.scaleY ?? 1);
  const hasCustomScale = Math.abs(rawScaleX - 1) > 0.001 || Math.abs(rawScaleY - 1) > 0.001;

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

      <form onSubmit={handleSubmit(submit)} className="grid gap-4">
        {block.type === 'text' && (
          <FormSection title="Content" description="Edit the text copy and its display size.">
            <div className="grid gap-2">
              <FieldLabel>Text</FieldLabel>
              <TextArea {...register('value')} />
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
              <TextInput {...register('headline')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Subhead</FieldLabel>
              <TextArea {...register('subhead')} />
            </div>
            <div className="grid gap-2">
              <FieldLabel>Headline size (px)</FieldLabel>
              <TextInput type="number" className="max-w-[120px]" {...register('headlineSize')} />
            </div>
          </FormSection>
        )}

        {block.type === 'navButton' && (
          <FormSection title="Navigation" description="Choose the label and where this button should take the user.">
            <div className="grid gap-2">
              <FieldLabel>Label</FieldLabel>
              <TextInput {...register('label')} />
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
                const ok = confirm('Delete this block?');
                if (!ok) return;
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



