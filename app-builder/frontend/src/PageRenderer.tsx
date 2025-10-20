import { BlockRenderer } from './shared/BlockRenderer'
import type { Page, Block } from './shared/BlockTypes'

export function PageRenderer({ page, onEditBlock, onDeleteBlock, onSelectBlock }: { page: Page; onEditBlock?: (b: Block) => void; onDeleteBlock?: (id: string) => void; onSelectBlock?: (b: Block) => void }) {
  return (
    <div style={{ width: 640, margin: '0 auto', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
      {page.blocks.map(b => (
        <div key={b.id} style={{ position: 'relative', marginBottom: 12, cursor: 'pointer' }} onClick={() => onSelectBlock?.(b)}>
          <BlockRenderer block={b} />
          <div style={{ display: 'flex', gap: 8, padding: 8 }}>
            <button onClick={(e) => { e.stopPropagation(); onEditBlock?.(b); }}>Edit</button>
            <button onClick={(e) => { e.stopPropagation(); onDeleteBlock?.(b.id); }}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  )
}
