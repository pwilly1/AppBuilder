// © 2025 Preston Willis. All rights reserved.
import React, { useState } from 'react'

import Landing from './components/Landing'
import Account from './pages/Account'
import Dashboard from './pages/Dashboard'

import { BrowserRouter, Navigate, Routes, Route, useLocation, useNavigate, useParams } from 'react-router-dom'
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
    applyBlockTransaction,
    applyProjectTransaction,
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
          applyBlockTransaction={applyBlockTransaction}
          applyProjectTransaction={applyProjectTransaction}
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
      </div>
    </BrowserRouter>
  )
}

function AppContent(props: any) {
  const navigate = useNavigate()
  const location = useLocation()
  const [previewMode, setPreviewMode] = React.useState(false)

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
    applyBlockTransaction,
    applyProjectTransaction,
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
  const isEditorRoute = location.pathname.startsWith('/editor')
  const isDashboardRoute = location.pathname.startsWith('/dashboard')
  const editorElement = (
    <EditorScreen
      project={project}
      page={page}
      pages={project?.pages || []}
      selectedPageId={selectedPageId}
      addBlock={addBlock}
      applyBlockTransaction={applyBlockTransaction}
      applyProjectTransaction={applyProjectTransaction}
      setSelectedBlock={setSelectedBlock}
      editBlock={editBlock}
      deleteBlock={deleteBlock}
      onReorder={onReorder}
      selectedBlock={selectedBlock}
      saveProject={saveProject}
      undo={undo}
      redo={redo}
      canUndo={canUndo}
      canRedo={canRedo}
      isSaving={isSaving}
      lastSavedAt={lastSavedAt}
      saveError={saveError}
      addPage={addPage}
      selectPage={selectPage}
      renamePage={renamePage}
      deletePage={deletePage}
      loadProjectById={loadProjectById}
      previewMode={previewMode}
      onPreviewModeChange={setPreviewMode}
    />
  )

  React.useEffect(() => {
    if (!location.pathname.startsWith('/editor')) setPreviewMode(false)
  }, [location.pathname])

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
      {!isEditorRoute ? (
        <Header
          authed={authed}
          logout={logout}
        />
      ) : null}

      <main className={`app-grid ${isEditorRoute ? 'editor-mode' : ''} ${isDashboardRoute ? 'dashboard-mode' : ''}`}>
        <Routes>
          <Route
            path="/"
            element={(
              <section className="col-span-3">
                {authed ? <Navigate to="/dashboard" replace /> : <Landing onLogin={() => { setAuthed(true); navigate('/dashboard') }} />}
              </section>
            )}
          />

          <Route
            path="/dashboard"
            element={(
              <section className="col-span-3">
                {authed ? <Dashboard onOpen={(proj: any) => openProject(proj, navigate)} /> : <Navigate to="/" replace />}
              </section>
            )}
          />

          <Route
            path="/account"
            element={(
              <section className="col-span-3">
                {authed ? <Account onBack={() => navigate('/dashboard')} /> : <Navigate to="/" replace />}
              </section>
            )}
          />

          <Route
            path="/editor"
            element={authed ? editorElement : <Navigate to="/" replace />}
          />

          <Route
            path="/editor/:projectId"
            element={authed ? editorElement : <Navigate to="/" replace />}
          />
        </Routes>
      </main>
      <Footer />
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
    applyBlockTransaction,
    applyProjectTransaction,
    setSelectedBlock,
    editBlock,
    deleteBlock,
    onReorder,
    selectedBlock,
    saveProject,
    undo,
    redo,
    canUndo,
    canRedo,
    isSaving,
    lastSavedAt,
    saveError,
    addPage,
    selectPage,
    renamePage,
    deletePage,
    previewMode,
    onPreviewModeChange,
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
      applyBlockTransaction={applyBlockTransaction}
      applyProjectTransaction={applyProjectTransaction}
      setSelectedBlock={setSelectedBlock}
      editBlock={editBlock}
      deleteBlock={deleteBlock}
      onReorder={onReorder}
      selectedBlock={selectedBlock}
      saveProject={saveProject}
      undo={undo}
      redo={redo}
      canUndo={canUndo}
      canRedo={canRedo}
      isSaving={isSaving}
      lastSavedAt={lastSavedAt}
      saveError={saveError}
      addPage={addPage}
      selectPage={selectPage}
      renamePage={renamePage}
      deletePage={deletePage}
      previewMode={previewMode}
      onPreviewModeChange={onPreviewModeChange}
    />
  )
}
