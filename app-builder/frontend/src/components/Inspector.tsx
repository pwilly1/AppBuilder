import React from 'react';
import { useForm } from 'react-hook-form';
import type { Block } from '../shared/BlockTypes';

export default function Inspector({ block, onSave, onClose }: { block?: Block | null; onSave?: (b: Block) => void; onClose?: () => void }) {
  const { register, handleSubmit, reset } = useForm({ defaultValues: block?.props || {} });

  React.useEffect(() => {
    reset(block?.props || {});
  }, [block, reset]);

  if (!block) return (
    <div className="card">
      <h4 className="text-lg font-medium">Inspector</h4>
      <p className="muted">Select a block to edit its properties.</p>
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
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-lg font-semibold">Inspector</h4>
        <button className="text-sm text-slate-500 hover:text-slate-700" onClick={onClose}>Close</button>
      </div>
      <p className="muted mb-3">Editing block: <strong className="text-slate-800">{block.type}</strong></p>
      <form onSubmit={handleSubmit(submit)} className="grid gap-3">
        {block.type === 'text' && (
          <>
            <label className="text-sm font-medium">Text</label>
            <textarea className="w-full border rounded-md p-2 text-sm" {...register('value')} />
            <label className="text-sm font-medium">Font size (px)</label>
            <input type="number" className="w-24 border rounded-md p-2 text-sm" {...register('fontSize')} />
          </>
        )}
        {block.type === 'hero' && (
          <>
            <label className="text-sm font-medium">Headline</label>
            <input className="w-full border rounded-md p-2 text-sm" {...register('headline')} />
            <label className="text-sm font-medium">Subhead</label>
            <input className="w-full border rounded-md p-2 text-sm" {...register('subhead')} />
            <label className="text-sm font-medium">Headline size (px)</label>
            <input type="number" className="w-24 border rounded-md p-2 text-sm" {...register('headlineSize')} />
          </>
        )}
        <div className="mt-2">
          <button className="btn" type="submit">Save</button>
        </div>
      </form>
    </div>
  );
}
