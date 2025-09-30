import type { Block } from './shared/BlockTypes'

export function AddBlock({ onAdd }: { onAdd: (b: Block)=>void }) {
  return (
    <div style={{ padding: 12, borderLeft: '1px solid #eee' }}>
      <strong>Add Block</strong>
      <div style={{ display:'grid', gap:8, marginTop:8 }}>
        <button onClick={()=>onAdd({ id: crypto.randomUUID(), type:'hero', props:{ headline:'New Hero', subhead:'' } as any })}>
          Hero
        </button>
        <button onClick={()=>onAdd({ id: crypto.randomUUID(), type:'text', props:{ value:'New text' } as any })}>
          Text
        </button>
        {/* add more types later */}
      </div>
    </div>
  )
}
