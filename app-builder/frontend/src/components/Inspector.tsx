// © 2025 Preston Willis. All rights reserved.
import React from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import type { Block } from '../shared/schema/types';

type PageLite = { id: string; title?: string; path?: string };

type InspectorProps = {
  block?: Block | null;
  pages?: PageLite[];
  onSave?: (b: Block) => void;
  onClose?: () => void;
  onDelete?: (id: string) => void;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-slate-800">{children}</label>;
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full border border-slate-300 rounded-md p-2 text-sm text-slate-900 ${props.className ?? ''}`} />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full border border-slate-300 rounded-md p-2 text-sm text-slate-900 ${props.className ?? ''}`} />;
}

function ToggleInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`h-4 w-4 rounded border-slate-300 text-slate-900 ${props.className ?? ''}`} />;
}

function ArrayCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">{children}</div>;
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
      <div className="card bg-white border border-slate-200 rounded-xl p-4">
        <h4 className="text-lg font-semibold text-slate-900">Inspector</h4>
        <p className="text-sm text-slate-500">Select a block to edit its properties.</p>
      </div>
    );
  }

  const submit = (vals: any) => {
    const props = { ...vals } as any;
    if (props.fontSize) props.fontSize = Number(props.fontSize);
    if (props.headlineSize) props.headlineSize = Number(props.headlineSize);
    if (props.columns) props.columns = Number(props.columns);
    const updated: Block = { ...block, props };
    onSave?.(updated);
  };

  return (
    <div className="card bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-lg font-semibold text-slate-900">Inspector</h4>
        <button className="text-sm text-slate-600 hover:text-slate-800" onClick={onClose}>Close</button>
      </div>
      <p className="text-sm text-slate-600 mb-3">Editing block: <strong className="text-slate-900">{block.type}</strong></p>
      <form onSubmit={handleSubmit(submit)} className="grid gap-3">
        {block.type === 'text' && (
          <>
            <FieldLabel>Text</FieldLabel>
            <TextArea {...register('value')} />
            <FieldLabel>Font size (px)</FieldLabel>
            <TextInput type="number" className="w-24" {...register('fontSize')} />
          </>
        )}

        {block.type === 'hero' && (
          <>
            <FieldLabel>Headline</FieldLabel>
            <TextInput {...register('headline')} />
            <FieldLabel>Subhead</FieldLabel>
            <TextInput {...register('subhead')} />
            <FieldLabel>Headline size (px)</FieldLabel>
            <TextInput type="number" className="w-24" {...register('headlineSize')} />
          </>
        )}

        {block.type === 'navButton' && (
          <>
            <FieldLabel>Label</FieldLabel>
            <TextInput {...register('label')} />

            <FieldLabel>Target page</FieldLabel>
            <select className="w-full border border-slate-300 rounded-md p-2 text-sm text-slate-900" {...register('toPageId')}>
              <option value="">Select a page...</option>
              {(pages || []).map((pg) => (
                <option key={pg.id} value={pg.id}>
                  {pg.title || pg.id}
                </option>
              ))}
            </select>
            <div className="text-xs text-slate-500">This will switch to the selected page at runtime.</div>
          </>
        )}

        {block.type === 'servicesList' && (
          <>
            <FieldLabel>Section title</FieldLabel>
            <TextInput {...register('title')} />
            <div className="flex items-center justify-between mt-1">
              <FieldLabel>Services</FieldLabel>
              <button
                type="button"
                className="text-sm px-2 py-1 rounded-md bg-slate-900 text-white hover:bg-slate-800"
                onClick={() => servicesArray.append({ name: 'New Service', description: '', price: '' })}
              >
                Add Service
              </button>
            </div>
            <div className="grid gap-3">
              {servicesArray.fields.map((field, index) => (
                <ArrayCard key={field.id}>
                  <div className="grid gap-2">
                    <FieldLabel>Name</FieldLabel>
                    <TextInput {...register(`items.${index}.name`)} />
                    <FieldLabel>Description</FieldLabel>
                    <TextArea rows={3} {...register(`items.${index}.description`)} />
                    <FieldLabel>Price</FieldLabel>
                    <TextInput {...register(`items.${index}.price`)} />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="text-sm text-red-600 hover:text-red-700"
                        onClick={() => servicesArray.remove(index)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </ArrayCard>
              ))}
            </div>
          </>
        )}

        {block.type === 'contactForm' && (
          <>
            <FieldLabel>Title</FieldLabel>
            <TextInput {...register('title')} />
            <FieldLabel>Subtitle</FieldLabel>
            <TextArea rows={3} {...register('subtitle')} />
            <FieldLabel>Destination email</FieldLabel>
            <TextInput type="email" placeholder="owner@business.com" {...register('destinationEmail')} />
            <FieldLabel>Submit label</FieldLabel>
            <TextInput {...register('submitLabel')} />
            <FieldLabel>Success message</FieldLabel>
            <TextArea rows={3} {...register('successMessage')} />

            <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <label className="flex items-center gap-2 text-sm text-slate-800">
                <ToggleInput type="checkbox" {...register('showName')} />
                Show name field
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-800">
                <ToggleInput type="checkbox" {...register('showEmail')} />
                Show email field
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-800">
                <ToggleInput type="checkbox" {...register('showPhone')} />
                Show phone field
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-800">
                <ToggleInput type="checkbox" {...register('showMessage')} />
                Show message field
              </label>
            </div>
          </>
        )}

        {block.type === 'imageGallery' && (
          <>
            <FieldLabel>Section title</FieldLabel>
            <TextInput {...register('title')} />
            <FieldLabel>Columns</FieldLabel>
            <TextInput type="number" min={1} max={3} className="w-24" {...register('columns')} />
            <div className="flex items-center justify-between mt-1">
              <FieldLabel>Images</FieldLabel>
              <button
                type="button"
                className="text-sm px-2 py-1 rounded-md bg-slate-900 text-white hover:bg-slate-800"
                onClick={() => galleryArray.append({ url: '', caption: 'New image' })}
              >
                Add Image
              </button>
            </div>
            <div className="grid gap-3">
              {galleryArray.fields.map((field, index) => (
                <ArrayCard key={field.id}>
                  <div className="grid gap-2">
                    <FieldLabel>Image URL</FieldLabel>
                    <TextInput {...register(`images.${index}.url`)} />
                    <FieldLabel>Caption</FieldLabel>
                    <TextInput {...register(`images.${index}.caption`)} />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="text-sm text-red-600 hover:text-red-700"
                        onClick={() => galleryArray.remove(index)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </ArrayCard>
              ))}
            </div>
          </>
        )}

        <div className="mt-2">
          <button className="btn bg-slate-900 text-white hover:bg-slate-800" type="submit">Save</button>
          {onDelete ? (
            <button
              type="button"
              className="ml-3 text-sm text-red-600 bg-white px-3 py-1 rounded-md border border-red-200 hover:bg-red-50"
              onClick={() => {
                if (!block) return;
                const ok = confirm('Delete this block?');
                if (!ok) return;
                onDelete(block.id);
              }}
            >
              Delete
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
