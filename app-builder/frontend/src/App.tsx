import { Preview } from './editor/Preview'
import { useMemo, useState } from 'react'
import type { Project, Page, Block } from './shared/BlockTypes'
import { PageRenderer } from './PageRenderer'
import { PageList } from './PageList'
import { AddBlock } from './AddBlock'

const initialProject: Project = {
  id: 'proj1',
  name: 'My App',
  pages: [
    {
      id: 'home', title: 'Home', path: '/home',
      blocks: [
        { id: 'b1', type: 'hero', props: { headline: 'Welcome to My App', subhead:'Edit me' } },
        { id: 'b2', type: 'text', props: { value: 'This is a text block.' } },
      ]
    },
    { id: 'contact', title: 'Contact', path: '/contact', blocks: [] },
  ],
}

export default function App() {
  const [project, setProject] = useState<Project>(initialProject)
  const [selectedPageId, setSelectedPageId] = useState<string>(project.pages[0].id)

  const page = useMemo(
    () => project.pages.find(p=>p.id===selectedPageId)!,
    [project, selectedPageId]
  )

  const renamePage = (id:string, title:string) => {
    setProject(p => ({
      ...p,
      pages: p.pages.map(pg => pg.id===id ? { ...pg, title } : pg)
    }))
  }

  const addPage = () => {
    const title = prompt('Page title', 'New Page')?.trim()
    if (!title) return
    const id = crypto.randomUUID()
    setProject(p => ({
      ...p,
      pages: [...p.pages, { id, title, path: `/${title.toLowerCase().replace(/\\s+/g,'-')}`, blocks: [] }]
    }))
    setSelectedPageId(id)
  }

  const addBlock = (b: Block) => {
    setProject(p => ({
      ...p,
      pages: p.pages.map(pg => pg.id===selectedPageId ? { ...pg, blocks: [...pg.blocks, b] } : pg)
    }))
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'260px 1fr 260px', height:'100vh' }}>
      <PageList
        pages={project.pages}
        selectedId={selectedPageId}
        onSelect={setSelectedPageId}
        onRename={renamePage}
        onAddPage={addPage}
      />
      <div style={{ padding:16, overflow:'auto' }}>
        <PageRenderer page={page} />
      </div>
      <AddBlock onAdd={addBlock} />
    </div>
  )
}

