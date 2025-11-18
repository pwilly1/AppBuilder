import React from 'react'
import { PageRenderer } from '../PageRenderer'
import { AddBlock } from '../AddBlock'
import Inspector from '../components/Inspector'

type Props = {
  page: any
  addBlock: (b: any) => void
  setSelectedBlock: (b: any) => void
  editBlock: (b: any) => void
  deleteBlock: (id: string) => void
  onReorder: (blocks: any[]) => void
  selectedBlock: any
  saveProject: () => void
}

export default function EditorLayout(props: Props) {
  const { page, addBlock, setSelectedBlock, editBlock, deleteBlock, onReorder, selectedBlock } = props

  return (
    <>
      <aside className="sidebar-hidden-mobile">
        <AddBlock onAdd={addBlock} />
      </aside>

      <section className="overflow-auto">
        {page ? (
          <PageRenderer
            page={page}
            onSelectBlock={(b: any) => setSelectedBlock(b)}
            onUpdateBlock={editBlock}
            onReorder={(newBlocks: any[]) => onReorder(newBlocks)}
          />
        ) : (
          <div className="card">
            <h3 className="text-lg font-medium">No page selected</h3>
            <p className="muted">Create a page or open a project with pages to start editing.</p>
          </div>
        )}
      </section>

      <aside>
        <Inspector
          block={selectedBlock}
          onSave={(b: any) => {
            setSelectedBlock(null)
            editBlock(b)
          }}
          onClose={() => setSelectedBlock(null)}
          onDelete={(id: string) => {
            setSelectedBlock(null)
            deleteBlock(id)
          }}
        />
      </aside>
    </>
  )
}
