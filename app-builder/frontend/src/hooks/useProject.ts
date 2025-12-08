import { useEffect, useRef, useState } from 'react'
// © 2025 Preston Willis. All rights reserved.
import type { Project, Block } from '../shared/schema/types'
import { getProject, updateProject, createProject, getToken, listProjects } from '../api'

export default function useProject(setAuthed: (a: boolean) => void) {
  const initialProject: Project = {
    id: 'proj1',
    name: 'My App',
    pages: [
      { id: 'home', title: 'Home', path: '/home', blocks: [] },
    ],
  }

  const [project, setProject] = useState<Project>(initialProject)
  const [history, setHistory] = useState<Project[]>(() => [JSON.parse(JSON.stringify(initialProject))])
  const [historyIndex, setHistoryIndex] = useState<number>(0)
  const [selectedPageId, setSelectedPageId] = useState<string>(() => project.pages?.[0]?.id ?? '')
  const [selectedBlock, setSelectedBlock] = useState<any | null>(null)

  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const autosaveTimer = useRef<number | null>(null)
  const isFirstMount = useRef<boolean>(true)

  // derived
  const page = project.pages.find((p) => p.id === selectedPageId)
  // utils
  function slugify(input: string): string {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }

  function uniquePath(base: string, pages: any[], excludeId?: string): string {
    const baseSlug = base || 'page'
    let candidate = `/${baseSlug}`
    let n = 2
    const taken = new Set(pages.filter(pg => pg.id !== excludeId).map(pg => pg.path))
    while (taken.has(candidate)) {
      candidate = `/${baseSlug}-${n++}`
    }
    return candidate
  }


  // history helpers
  function applyChange(mutator: (p: Project) => Project) {
    setProject((current) => {
      const updated = mutator(JSON.parse(JSON.stringify(current)))
      setHistory((h) => {
        const base = h.slice(0, historyIndex + 1)
        const next = base.concat([JSON.parse(JSON.stringify(updated))])
        const MAX = 100
        if (next.length > MAX) next.splice(0, next.length - MAX)
        setHistoryIndex(next.length - 1)
        return next
      })
      return updated
    })
  }

  function canUndo() {
    return historyIndex > 0
  }

  function canRedo() {
    return historyIndex < history.length - 1
  }

  function undo() {
    setHistoryIndex((i) => {
      if (i <= 0) return i
      const ni = i - 1
      const snap = history[ni]
      setProject(JSON.parse(JSON.stringify(snap)))
      return ni
    })
  }

  function redo() {
    setHistoryIndex((i) => {
      if (i >= history.length - 1) return i
      const ni = i + 1
      const snap = history[ni]
      setProject(JSON.parse(JSON.stringify(snap)))
      return ni
    })
  }

  // CRUD helpers
  const addBlock = (b: Block) => {
    applyChange((p) => ({
      ...p,
      pages: p.pages.map((pg) => (pg.id === selectedPageId ? { ...pg, blocks: [...pg.blocks, b] } : pg)),
    }))
  }

  // Pages API
  function selectPage(id: string) {
    setSelectedPageId(id)
  }

  function addPage(title?: string) {
    const id = crypto.randomUUID()
    applyChange((p) => {
      const nextIndex = p.pages.length + 1
      const pageTitle = (title && title.trim()) || `Page ${nextIndex}`
      const path = uniquePath(slugify(pageTitle), p.pages)
      const newPage = { id, title: pageTitle, path, blocks: [] }
      return { ...p, pages: [...p.pages, newPage] }
    })
    setSelectedPageId(id)
  }

  function renamePage(id: string, title: string, autoUpdatePath = true) {
    applyChange((p) => {
      const newTitle = title?.trim() || 'Untitled'
      const newPages = p.pages.map((pg) => {
        if (pg.id !== id) return pg
        const next: any = { ...pg, title: newTitle }
        if (autoUpdatePath) {
          const proposed = slugify(newTitle) || 'page'
          next.path = uniquePath(proposed, p.pages, id)
        }
        return next
      })
      return { ...p, pages: newPages }
    })
  }

  function deletePage(id: string) {
    let nextSelected: string | null = null
    applyChange((p) => {
      if (p.pages.length <= 1) return p // guard: cannot delete last page
      const idx = p.pages.findIndex((pg) => pg.id === id)
      const remaining = p.pages.filter((pg) => pg.id !== id)
      // choose neighbor or first
      const pickIndex = Math.min(idx, Math.max(0, remaining.length - 1))
      nextSelected = remaining[pickIndex]?.id ?? remaining[0].id
      return { ...p, pages: remaining }
    })
    if (nextSelected) setSelectedPageId(nextSelected)
  }

  async function openProject(proj: any, navigate?: (path: string) => void) {
    let full = proj
    if (!full.pages) {
      full = await getProject(proj.id)
    }
    if (!full.pages || full.pages.length === 0) {
      const id = crypto.randomUUID()
      full.pages = [{ id, title: 'Home', path: '/home', blocks: [] }]
    }

    setProject(full)
    setSelectedPageId(full.pages[0].id)
    const snapshot = JSON.parse(JSON.stringify(full))
    setHistory([snapshot])
    setHistoryIndex(0)

    if (navigate) navigate('/editor')
  }

  function editBlock(updated: Block) {
    applyChange((p) => ({
      ...p,
      pages: p.pages.map((pg) => (pg.id === selectedPageId ? { ...pg, blocks: pg.blocks.map((b) => (b.id === updated.id ? updated : b)) } : pg)),
    }))
  }

  function deleteBlock(id: string) {
    applyChange((p) => ({
      ...p,
      pages: p.pages.map((pg) => (pg.id === selectedPageId ? { ...pg, blocks: pg.blocks.filter((b) => b.id !== id) } : pg)),
    }))
  }

  async function saveProject() {
    setIsSaving(true)
    setSaveError(null)
    try {
      const isObjectIdLike = typeof project.id === 'string' && /^[0-9a-fA-F]{24}$/.test(project.id)
      if (!isObjectIdLike) {
        const created: any = await createProject(project)
        setProject(created)
        setLastSavedAt(Date.now())
        return
      }
      await updateProject(project.id, project)
      setLastSavedAt(Date.now())
    } catch (err: any) {
      if (err?.status === 403) {
        try { localStorage.removeItem('app_token') } catch { }
        setAuthed(false)
        return
      }
      setSaveError(err?.message ?? 'Save failed')
    } finally {
      setIsSaving(false)
    }
  }

  async function apiSaveProjectSilent(proj: Project) {
    if (!getToken()) throw new Error('Not authenticated')
    const isObjectIdLike = typeof proj.id === 'string' && /^[0-9a-fA-F]{24}$/.test(proj.id)
    if (!isObjectIdLike) {
      const created: any = await createProject(proj)
      return created
    }
    await updateProject(proj.id, proj)
    return proj
  }

  // autosave
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }
    if (!getToken()) return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = window.setTimeout(async () => {
      setIsSaving(true)
      try {
        const res = await apiSaveProjectSilent(project)
        if (res && res.id && res.id !== project.id) setProject(res)
        setLastSavedAt(Date.now())
        setSaveError(null)
      } catch (e: any) {
        setSaveError(e?.message ?? 'Autosave failed')
      } finally {
        setIsSaving(false)
      }
    }, 1500)

    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current) }
  }, [project])

  function onReorder(newBlocks: any[]) {
    applyChange((p) => ({
      ...p,
      pages: p.pages.map((pg) => (pg.id === selectedPageId ? { ...pg, blocks: newBlocks } : pg)),
    }))
  }

  // token check (mirror of previous behavior)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!getToken()) return
      try {
        await listProjects()
        if (mounted) setAuthed(true)
      } catch (err: any) {
        if (err.message && err.message.toLowerCase().includes('unauthorized') || err.message === 'Unauthorized') {
          try { localStorage.removeItem('app_token') } catch { }
        }
        if (mounted) setAuthed(false)
      }
    })()
    return () => { mounted = false }
  }, [setAuthed])

  return {
    project,
    setProject,
    selectedPageId,
    setSelectedPageId,
    page,
    selectedBlock,
    setSelectedBlock,
    addBlock,
    addPage,
    selectPage,
    renamePage,
    deletePage,
    openProject,
    editBlock,
    deleteBlock,
    saveProject,
    undo,
    redo,
    canUndo,
    canRedo,
    onReorder,
    isSaving,
    lastSavedAt,
    saveError,
  }
}
