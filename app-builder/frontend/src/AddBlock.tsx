import type { Block } from './shared/BlockTypes'

export function AddBlock({ onAdd }: { onAdd: (b: Block)=>void }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <strong className="text-sm">Add Block</strong>
      </div>
      <div className="grid gap-2">
        <button className="btn" onClick={()=>onAdd({ id: crypto.randomUUID(), type:'hero', props:{ headline:'New Hero', subhead:'' } as any })}>
          Hero
        </button>
        <button className="btn bg-slate-800 hover:bg-slate-700" onClick={()=>onAdd({ id: crypto.randomUUID(), type:'text', props:{ value:'New text' } as any })}>
          Text
        </button>
        {/* add more types later */}
      </div>
    </div>
  )
}
