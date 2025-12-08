// © 2025 Preston Willis. All rights reserved.
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
  if (error) return <div className="card text-red-500">{error}</div>
  if (!user) return <div className="card">No account information available.</div>

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Account</h3>
        {onBack ? (
          <button className="text-sm muted" onClick={onBack}>← Back</button>
        ) : null}
      </div>
      <div className="mt-3 grid gap-2">
        <div><strong>Username:</strong> {user.username ?? '(none)'}</div>
        <div><strong>Email:</strong> {user.email ?? '(none)'}</div>
        <div><strong>Id:</strong> {user.id ?? user._id}</div>
        <div><strong>Guest:</strong> {user.isGuest ? 'Yes' : 'No'}</div>
        <div><strong>Created:</strong> {user.createdAt ? new Date(user.createdAt).toLocaleString() : '—'}</div>
      </div>
    </div>
  )
}
