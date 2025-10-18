import { BlockRenderer } from './shared/BlockRenderer'
import type { Page, Block } from './shared/BlockTypes'

export function PageRenderer({ page, onEditBlock, onDeleteBlock }: { page: Page; onEditBlock?: (b: Block) => void; onDeleteBlock?: (id: string) => void }) {
  return (
    <div style={{ width: 390, margin: '0 auto', border: '1px solid #e5e7eb', borderRadius: 12 }}>
      {page.blocks.map(b => (
        <div key={b.id} style={{ position: 'relative' }}>
          <BlockRenderer block={b} />
          <div style={{ display: 'flex', gap: 8, padding: 8 }}>
            <button onClick={() => onEditBlock?.(b)}>Edit</button>
            <button onClick={() => onDeleteBlock?.(b.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  )
}
