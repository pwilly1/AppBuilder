import { BlockRenderer } from './shared/BlockRenderer'
import type { Page, Block } from './shared/BlockTypes'

export function PageRenderer({ page, onEditBlock, onDeleteBlock, onSelectBlock }: { page: Page; onEditBlock?: (b: Block) => void; onDeleteBlock?: (id: string) => void; onSelectBlock?: (b: Block) => void }) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
        {page.blocks.map(b => (
          <div key={b.id} className="relative mb-4 group" onClick={() => onSelectBlock?.(b)}>
            <BlockRenderer block={b} />
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="text-sm text-slate-600 bg-white/60 px-2 py-1 rounded-md hover:bg-white" onClick={(e) => { e.stopPropagation(); onEditBlock?.(b); }}>Edit</button>
              <button className="text-sm text-red-500 bg-white/60 px-2 py-1 rounded-md hover:bg-white" onClick={(e) => { e.stopPropagation(); onDeleteBlock?.(b.id); }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
