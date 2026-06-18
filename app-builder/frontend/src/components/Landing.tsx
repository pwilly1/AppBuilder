import { useState } from 'react'
import Login from './Login'
import Signup from './Signup'

// ï¿½ 2025 Preston Willis. All rights reserved.
export default function Landing({ onLogin }: { onLogin: () => void }) {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')

  return (
    <div className="relative min-h-[calc(100vh-14rem)] overflow-hidden px-2 py-4">
      <div className="absolute left-[-7rem] top-12 h-72 w-72 rounded-full bg-blue-500/18 blur-3xl" />
      <div className="absolute right-[-5rem] top-2 h-80 w-80 rounded-full bg-sky-400/14 blur-3xl" />
      <div className="shell-panel relative mx-auto grid w-full max-w-[var(--max-width)] gap-8 overflow-hidden rounded-[2.25rem] p-5 md:grid-cols-[1.08fr_0.92fr] md:p-8 lg:p-10">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />
        <div className="flex min-w-0 flex-col justify-between">
          <div>
            <div className="tag">Native-first builder</div>
            <h1 className="section-heading mt-5 max-w-3xl text-5xl font-semibold leading-[0.92] text-slate-950 md:text-6xl">
              Build native-ready apps without losing design control.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
              Apptura gives a cleaner path from idea to mobile app: visual page building, industry
              blocks, live preview, and a runtime that already thinks in native screens.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          </div>

          <div className="mt-8 rounded-[1.75rem] border border-slate-200/70 bg-white/55 p-3 shadow-inner">
            <div className="rounded-[1.35rem] border border-slate-200/80 bg-[#fffcf6] p-3 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Builder preview</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">FieldReady Demo</div>
                </div>
                <div className="rounded-full bg-blue-600 px-3 py-1 text-[11px] font-semibold text-white">Live</div>
              </div>
              <div className="grid gap-3 md:grid-cols-[0.72fr_1fr_0.72fr]">
                <div className="hidden rounded-2xl border border-slate-200/70 bg-[#f7f1e6]/70 p-3 md:block">
                  <div className="mb-3 h-2 w-16 rounded-full bg-slate-300/70" />
                  <div className="space-y-2">
                    <div className="h-8 rounded-xl bg-blue-100" />
                    <div className="h-8 rounded-xl bg-white" />
                    <div className="h-8 rounded-xl bg-white" />
                  </div>
                </div>
                <div className="mx-auto h-64 w-36 overflow-hidden rounded-[1.6rem] border-[7px] border-slate-900 bg-white shadow-xl">
                  <div className="h-full bg-[linear-gradient(180deg,#ffffff_0%,#eff6ff_100%)] p-3">
                    <div className="h-5 w-16 rounded-full bg-blue-600" />
                    <div className="mt-5 h-5 w-24 rounded bg-slate-900" />
                    <div className="mt-2 h-5 w-20 rounded bg-slate-900" />
                    <div className="mt-5 space-y-2">
                      <div className="h-2 rounded bg-slate-300" />
                      <div className="h-2 rounded bg-slate-300" />
                      <div className="h-2 w-3/4 rounded bg-slate-300" />
                    </div>
                    <div className="mt-6 rounded-xl border border-blue-100 bg-white p-2">
                      <div className="h-2 w-14 rounded bg-slate-300" />
                      <div className="mt-2 h-5 rounded bg-blue-50" />
                    </div>
                    <div className="mt-4 h-8 rounded-full bg-blue-600" />
                  </div>
                </div>
                <div className="hidden rounded-2xl border border-slate-200/70 bg-[#f7f1e6]/70 p-3 md:block">
                  <div className="mb-3 h-2 w-20 rounded-full bg-slate-300/70" />
                  <div className="space-y-2">
                    <div className="h-7 rounded-xl bg-white" />
                    <div className="h-7 rounded-xl bg-white" />
                    <div className="h-7 rounded-xl bg-blue-100" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div id="features" className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Design</div>
              <div className="mt-2 text-base font-semibold leading-6 text-slate-900">Shape real phone screens with focused blocks.</div>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Business-ready</div>
              <div className="mt-2 text-base font-semibold leading-6 text-slate-900">Project dashboards, forms, and reusable app primitives.</div>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Native runtime</div>
              <div className="mt-2 text-base font-semibold leading-6 text-slate-900">A Kotlin preview path that mirrors the shared schema.</div>
            </div>
          </div>
        </div>

        <div id="auth-panel" className="dark-panel rounded-[1.9rem] p-4 md:p-5">
          <div className="mb-4 rounded-2xl border border-white/10 bg-white/6 p-4 text-white">
            <div className="text-sm uppercase tracking-[0.2em] text-white/60">Secure access</div>
            <div className="mt-2 text-2xl font-semibold">{authMode === 'signin' ? 'Sign in to your workspace' : 'Create your account'}</div>
            <p className="mt-2 text-sm leading-6 text-white/70">
              Build and save projects from the live builder workspace.
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

          <div className="mb-4 rounded-2xl border border-blue-300/20 bg-blue-300/10 px-4 py-3 text-sm leading-6 text-blue-50">
            <span className="font-semibold">Demo note:</span> Create a temporary account to try the live builder. No payment
            or email verification is required, and your projects can be saved after signing in.
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
