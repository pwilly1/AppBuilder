import { BlockRenderer } from '../shared/BlockRenderer';
import type { Block } from '../shared/schema/types';

export function Preview({ blocks }: { blocks: Block[] }) {
  return (
    <div style={{ width: 390, margin: '0 auto', border: '1px solid #e5e7eb', borderRadius: 12 }}>
      {blocks.map(b => <BlockRenderer key={b.id} block={b} />)}
    </div>
  );
}
