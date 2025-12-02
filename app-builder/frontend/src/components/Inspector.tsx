import React from 'react';
import { useForm } from 'react-hook-form';
import type { Block } from '../shared/schema/types';

export default function Inspector({ block, onSave, onClose, onDelete }: { block?: Block | null; onSave?: (b: Block) => void; onClose?: () => void; onDelete?: (id: string) => void }) {
  const { register, handleSubmit, reset } = useForm({ defaultValues: block?.props || {} });

  React.useEffect(() => {
    reset(block?.props || {});
  }, [block, reset]);

  if (!block) return (
    <div className="card bg-white border border-slate-200 rounded-xl p-4">
      <h4 className="text-lg font-semibold text-slate-900">Inspector</h4>
      <p className="text-sm text-slate-500">Select a block to edit its properties.</p>
    </div>
  );

  const submit = (vals: any) => {
    // coerce numeric fields
    const props = { ...vals } as any;
    if (props.fontSize) props.fontSize = Number(props.fontSize);
    if (props.headlineSize) props.headlineSize = Number(props.headlineSize);
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
            <label className="text-sm font-medium text-slate-800">Text</label>
            <textarea className="w-full border border-slate-300 rounded-md p-2 text-sm text-slate-900" {...register('value')} />
            <label className="text-sm font-medium text-slate-800">Font size (px)</label>
            <input type="number" className="w-24 border border-slate-300 rounded-md p-2 text-sm text-slate-900" {...register('fontSize')} />
          </>
        )}
        {block.type === 'hero' && (
          <>
            <label className="text-sm font-medium text-slate-800">Headline</label>
            <input className="w-full border border-slate-300 rounded-md p-2 text-sm text-slate-900" {...register('headline')} />
            <label className="text-sm font-medium text-slate-800">Subhead</label>
            <input className="w-full border border-slate-300 rounded-md p-2 text-sm text-slate-900" {...register('subhead')} />
            <label className="text-sm font-medium text-slate-800">Headline size (px)</label>
            <input type="number" className="w-24 border border-slate-300 rounded-md p-2 text-sm text-slate-900" {...register('headlineSize')} />
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
            >Delete</button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
