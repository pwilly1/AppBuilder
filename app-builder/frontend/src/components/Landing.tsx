import { useState } from 'react'
import Login from './Login'
import Signup from './Signup'

// © 2025 Preston Willis. All rights reserved.
export default function Landing({ onLogin }: { onLogin: () => void }) {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')

  function focusAuthPanel(mode: 'signin' | 'signup') {
    setAuthMode(mode)
    const target = document.getElementById('auth-panel')
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="relative min-h-[calc(100vh-14rem)] overflow-hidden px-2 py-4">
      <div className="absolute left-[-6rem] top-20 h-56 w-56 rounded-full bg-blue-500/18 blur-3xl" />
      <div className="absolute right-[-4rem] top-6 h-64 w-64 rounded-full bg-sky-400/16 blur-3xl" />
      <div className="shell-panel relative mx-auto grid w-full max-w-[var(--max-width)] gap-10 rounded-[2rem] p-6 md:grid-cols-[1.15fr_0.85fr] md:p-8 lg:p-10">
        <div className="flex flex-col justify-between">
          <div>
            <div className="tag">Native-first builder</div>
            <h1 className="section-heading mt-5 max-w-3xl text-5xl font-semibold leading-[0.95] text-slate-900 md:text-6xl">
              Build polished client apps before you touch Android Studio.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
              Apptura gives small businesses a cleaner path from idea to mobile app: visual page building, industry
              blocks, live preview, and a runtime that already thinks in native screens.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button className="btn min-w-[170px]" onClick={() => focusAuthPanel('signin')}>Sign in to builder</button>
            <button className="ghost-btn min-w-[170px]" onClick={() => focusAuthPanel('signup')}>Create account</button>
          </div>

          <div id="features" className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Design</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">Drag blocks, shape pages, preview instantly.</div>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Business-ready</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">Services, galleries, contact forms, and templates.</div>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Native runtime</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">A Kotlin preview path that stays aligned with the web editor.</div>
            </div>
          </div>
        </div>

        <div id="auth-panel" className="rounded-[1.75rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(12,23,45,0.98)_0%,rgba(18,35,67,0.96)_100%)] p-4 shadow-[0_28px_48px_rgba(15,23,32,0.24)] md:p-5">
          <div className="mb-4 rounded-2xl border border-white/10 bg-white/6 p-4 text-white">
            <div className="text-sm uppercase tracking-[0.2em] text-white/60">Secure access</div>
            <div className="mt-2 text-2xl font-semibold">{authMode === 'signin' ? 'Sign in to your workspace' : 'Create your account'}</div>
            <p className="mt-2 text-sm leading-6 text-white/70">
              {authMode === 'signin'
                ? 'Pick up where you left off, open projects, and keep building.'
                : 'Set up your account and start building without leaving the page.'}
            </p>
          </div>

          <div className="mb-5 inline-flex rounded-full border border-white/10 bg-white/6 p-1">
            <button type="button" className="auth-tab" data-active={authMode === 'signin'} onClick={() => setAuthMode('signin')}>
              Sign in
            </button>
            <button type="button" className="auth-tab" data-active={authMode === 'signup'} onClick={() => setAuthMode('signup')}>
              Create account
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
            {authMode === 'signin' ? (
              <Login onLogin={onLogin} onSwitchMode={() => setAuthMode('signup')} />
            ) : (
              <Signup onSignup={onLogin} onSwitchMode={() => setAuthMode('signin')} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
