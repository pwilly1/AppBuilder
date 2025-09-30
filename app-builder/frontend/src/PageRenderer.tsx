import { BlockRenderer } from './shared/BlockRenderer'
import type { Page } from './shared/BlockTypes'

export function PageRenderer({ page }: { page: Page }) {
  return (
    <div style={{ width: 390, margin: '0 auto', border: '1px solid #e5e7eb', borderRadius: 12 }}>
      {page.blocks.map(b => <BlockRenderer key={b.id} block={b} />)}
    </div>
  )
}
