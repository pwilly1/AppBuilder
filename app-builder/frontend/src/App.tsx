import React, { useEffect, useState } from 'react'
import type { Project } from './shared/BlockTypes'

import Landing from './components/Landing'
import Account from './pages/Account'
import Dashboard from './pages/Dashboard'

import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom'
import useProject from './hooks/useProject'
import Header from './components/Header'
import EditorLayout from './layout/EditorLayout'
import { getToken } from './api'

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
  } = projectApi

  function logout() {
    try { localStorage.removeItem('app_token') } catch {}
    setAuthed(false)
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen py-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-slate-100">
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
          openProject={openProject}
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

  const {
    authed,
    setAuthed,
    logout,
    selectedBlock,
    setSelectedBlock,
    page,
    addBlock,
    openProject,
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

  // keyboard shortcuts for undo/redo
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

      <main className={`app-grid ${window.location.pathname === '/editor' ? 'editor-mode' : ''}`}>
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
              <EditorLayout
                page={page}
                addBlock={addBlock}
                setSelectedBlock={setSelectedBlock}
                editBlock={editBlock}
                deleteBlock={deleteBlock}
                onReorder={onReorder}
                selectedBlock={selectedBlock}
                saveProject={saveProject}
              />
            )}
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  )
}

