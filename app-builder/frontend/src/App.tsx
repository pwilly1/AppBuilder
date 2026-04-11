// © 2025 Preston Willis. All rights reserved.
import React, { useState } from 'react'

import Landing from './components/Landing'
import Account from './pages/Account'
import Dashboard from './pages/Dashboard'

import { BrowserRouter, Routes, Route, useLocation, useNavigate, useParams } from 'react-router-dom'
import useProject from './hooks/useProject'
import Header from './components/Header'
import EditorLayout from './layout/EditorLayout'
import { getToken } from './api'
import Footer from './components/Footer'

export default function App() {
  const [authed, setAuthed] = useState<boolean>(() => !!getToken())
  const projectApi = useProject(setAuthed)

  const {
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
    loadProjectById,
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
  } = projectApi

  function logout() {
    try { localStorage.removeItem('app_token') } catch {}
    setAuthed(false)
  }

  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col text-slate-900">
        <AppContent
          authed={authed}
          setAuthed={setAuthed}
          logout={logout}
          project={project}
          setProject={setProject}
          selectedPageId={selectedPageId}
          setSelectedPageId={setSelectedPageId}
          selectedBlock={selectedBlock}
          setSelectedBlock={setSelectedBlock}
          page={page}
          addBlock={addBlock}
          addPage={addPage}
          selectPage={selectPage}
          renamePage={renamePage}
          deletePage={deletePage}
          openProject={openProject}
          loadProjectById={loadProjectById}
          editBlock={editBlock}
          deleteBlock={deleteBlock}
          saveProject={saveProject}
          undo={undo}
          redo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          onReorder={onReorder}
          isSaving={isSaving}
          lastSavedAt={lastSavedAt}
          saveError={saveError}
        />
        <Footer />
      </div>
    </BrowserRouter>
  )
}

function AppContent(props: any) {
  const navigate = useNavigate()
  const location = useLocation()

  const {
    authed,
    setAuthed,
    logout,
    project,
    selectedPageId,
    selectedBlock,
    setSelectedBlock,
    page,
    addBlock,
    addPage,
    selectPage,
    renamePage,
    deletePage,
    openProject,
    loadProjectById,
    editBlock,
    deleteBlock,
    saveProject,
    onReorder,
    undo,
    redo,
    canUndo,
    canRedo,
    isSaving,
    lastSavedAt,
    saveError,
  } = props

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      if (e.key === 'z' || e.key === 'Z') {
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
        e.preventDefault()
      } else if (e.key === 'y' || e.key === 'Y') {
        redo()
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  return (
    <>
      <Header
        authed={authed}
        setAuthed={props.setAuthed}
        logout={logout}
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        saveProject={saveProject}
        isSaving={isSaving}
        lastSavedAt={lastSavedAt}
        saveError={saveError}
      />

      <main className={`app-grid ${location.pathname.startsWith('/editor') ? 'editor-mode' : ''}`}>
        <Routes>
          <Route
            path="/"
            element={(
              <section className="col-span-3">
                <Landing onLogin={() => { setAuthed(true); navigate('/dashboard') }} />
              </section>
            )}
          />

          <Route
            path="/dashboard"
            element={(
              <section className="col-span-3">
                <Dashboard onOpen={(proj: any) => openProject(proj, navigate)} />
              </section>
            )}
          />

          <Route
            path="/account"
            element={(
              <section className="col-span-3">
                <Account onBack={() => navigate('/dashboard')} />
              </section>
            )}
          />

          <Route
            path="/editor"
            element={(
              <EditorScreen
                project={project}
                page={page}
                pages={project?.pages || []}
                selectedPageId={selectedPageId}
                addBlock={addBlock}
                setSelectedBlock={setSelectedBlock}
                editBlock={editBlock}
                deleteBlock={deleteBlock}
                onReorder={onReorder}
                selectedBlock={selectedBlock}
                saveProject={saveProject}
                addPage={addPage}
                selectPage={selectPage}
                renamePage={renamePage}
                deletePage={deletePage}
                loadProjectById={loadProjectById}
              />
            )}
          />

          <Route
            path="/editor/:projectId"
            element={(
              <EditorScreen
                project={project}
                page={page}
                pages={project?.pages || []}
                selectedPageId={selectedPageId}
                addBlock={addBlock}
                setSelectedBlock={setSelectedBlock}
                editBlock={editBlock}
                deleteBlock={deleteBlock}
                onReorder={onReorder}
                selectedBlock={selectedBlock}
                saveProject={saveProject}
                addPage={addPage}
                selectPage={selectPage}
                renamePage={renamePage}
                deletePage={deletePage}
                loadProjectById={loadProjectById}
              />
            )}
          />
        </Routes>
      </main>
    </>
  )
}

function EditorScreen(props: any) {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const {
    project,
    loadProjectById,
    page,
    pages,
    selectedPageId,
    addBlock,
    setSelectedBlock,
    editBlock,
    deleteBlock,
    onReorder,
    selectedBlock,
    saveProject,
    addPage,
    selectPage,
    renamePage,
    deletePage,
  } = props

  React.useEffect(() => {
    if (!projectId) return
    if (project?.id === projectId && project?.pages?.length) return
    void loadProjectById(projectId)
  }, [loadProjectById, project?.id, project?.pages?.length, projectId])

  React.useEffect(() => {
    const isObjectIdLike = typeof project?.id === 'string' && /^[0-9a-fA-F]{24}$/.test(project.id)
    if (!projectId && isObjectIdLike && location.pathname === '/editor') {
      navigate(`/editor/${project.id}`, { replace: true })
    }
  }, [location.pathname, navigate, project?.id, projectId])

  return (
    <EditorLayout
      projectId={project?.id}
      page={page}
      pages={pages}
      selectedPageId={selectedPageId}
      addBlock={addBlock}
      setSelectedBlock={setSelectedBlock}
      editBlock={editBlock}
      deleteBlock={deleteBlock}
      onReorder={onReorder}
      selectedBlock={selectedBlock}
      saveProject={saveProject}
      addPage={addPage}
      selectPage={selectPage}
      renamePage={renamePage}
      deletePage={deletePage}
    />
  )
}
