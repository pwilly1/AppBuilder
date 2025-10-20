import React from 'react';
import { useForm } from 'react-hook-form';
import type { Block } from '../shared/BlockTypes';

export default function Inspector({ block, onSave, onClose }: { block?: Block | null; onSave?: (b: Block) => void; onClose?: () => void }) {
  const { register, handleSubmit, reset } = useForm({ defaultValues: block?.props || {} });

  React.useEffect(() => {
    reset(block?.props || {});
  }, [block, reset]);

  if (!block) return (
    <div style={{ padding: 16 }}>
      <h4>Inspector</h4>
      <p>Select a block to edit its properties.</p>
    </div>
  );

  const submit = (vals: any) => {
    const updated: Block = { ...block, props: { ...vals } };
    onSave?.(updated);
  };

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4>Inspector</h4>
        <button onClick={onClose}>Close</button>
      </div>
      <p>Editing block: <strong>{block.type}</strong></p>
      <form onSubmit={handleSubmit(submit)} style={{ display: 'grid', gap: 8 }}>
        {block.type === 'text' && (
          <>
            <label>Text</label>
            <textarea {...register('value')} />
          </>
        )}
        {block.type === 'hero' && (
          <>
            <label>Headline</label>
            <input {...register('headline')} />
            <label>Subhead</label>
            <input {...register('subhead')} />
          </>
        )}
        <div style={{ marginTop: 8 }}>
          <button type="submit">Save</button>
        </div>
      </form>
    </div>
  );
}
