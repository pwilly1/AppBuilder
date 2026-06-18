// Copyright 2025 Preston Willis. All rights reserved.
import React from 'react'
import { getMe } from '../api'

export default function Account({ onBack }: { onBack?: () => void }) {
  const [user, setUser] = React.useState<any | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true
    setLoading(true)
    getMe().then((res:any)=>{
      if (!mounted) return
      setUser(res?.user ?? null)
    }).catch((err:any)=>{
      setError(err?.message || 'Failed to load')
    }).finally(()=>{ if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  if (loading) return <div className="card">Loading account...</div>
  if (error) return <div className="card text-red-600">{error}</div>
  if (!user) return <div className="card">No account information available.</div>

  return (
    <div className="shell-panel mx-auto w-full max-w-3xl rounded-[2rem] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-900/10 pb-5">
        <div>
          <div className="tag">Account</div>
          <h3 className="section-heading mt-3 text-4xl font-semibold text-slate-950">Workspace profile</h3>
          <p className="muted mt-2 text-sm">Review the signed-in account connected to this builder workspace.</p>
        </div>
        {onBack ? (
          <button className="ghost-btn" onClick={onBack}>Back to dashboard</button>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="editor-section">
          <div className="editor-section-title">Username</div>
          <div className="mt-2 text-lg font-semibold text-slate-900">{user.username ?? '(none)'}</div>
        </div>
        <div className="editor-section">
          <div className="editor-section-title">Email</div>
          <div className="mt-2 break-all text-lg font-semibold text-slate-900">{user.email ?? '(none)'}</div>
        </div>
        <div className="editor-section sm:col-span-2">
          <div className="editor-section-title">Account details</div>
          <dl className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
            <div>
              <dt className="font-semibold text-slate-900">Id</dt>
              <dd className="mt-1 break-all text-slate-500">{user.id ?? user._id}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">Guest</dt>
              <dd className="mt-1 text-slate-500">{user.isGuest ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">Created</dt>
              <dd className="mt-1 text-slate-500">{user.createdAt ? new Date(user.createdAt).toLocaleString() : '-'}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}
