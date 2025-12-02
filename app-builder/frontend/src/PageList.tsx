import type { Page } from './shared/schema/types'

export function PageList({
  pages, selectedId, onSelect, onRename, onAddPage
}: {
  pages: Page[]; selectedId: string; onSelect: (id:string)=>void;
  onRename: (id:string, title:string)=>void; onAddPage: ()=>void;
}) {
  return (
    <div style={{ padding: 12, borderRight: '1px solid #eee' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <strong>Pages</strong>
        <button onClick={onAddPage}>+ Add</button>
      </div>
      {pages.map(p => (
        <div key={p.id} style={{ padding:'6px 4px', background:p.id===selectedId?'#eef':'transparent', borderRadius:6, marginBottom:4 }}>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <button onClick={()=>onSelect(p.id)} style={{ flex:1, textAlign:'left', background:'none', border:'none', cursor:'pointer' }}>
              {p.title}
            </button>
            <button onClick={()=>{
              const t = prompt('New title', p.title)
              if (t && t.trim()) onRename(p.id, t.trim())
            }}>Rename</button>
          </div>
        </div>
      ))}
    </div>
  )
}
