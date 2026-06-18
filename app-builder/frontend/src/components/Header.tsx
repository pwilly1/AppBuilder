import { useNavigate } from 'react-router-dom'

type Props = {
  authed: boolean
  logout: () => void
}

export default function Header({ authed, logout }: Props) {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-40 mx-auto mb-3 w-full max-w-[var(--max-width)] px-4 pt-4">
      <div className="shell-panel flex items-center justify-between rounded-[1.85rem] px-5 py-4">
        <button
          type="button"
          className="flex cursor-pointer items-center gap-3"
          onClick={() => navigate(authed ? '/dashboard' : '/')}
          aria-label={authed ? 'Go to dashboard' : 'Go to landing'}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563eb] via-[#1d4ed8] to-[#172554] text-sm font-bold text-white shadow-[0_16px_28px_rgba(37,99,235,0.26)]">
            A
          </div>
          <div className="text-left">
            <h1 className="section-heading text-2xl font-semibold text-slate-950" title="Apptura">Apptura</h1>
            <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Native App Builder</div>
          </div>
        </button>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {authed ? (
            <>
              <button className="ghost-btn !px-3 !py-2 text-sm" onClick={() => navigate('/account')}>
                Account
              </button>
              <button
                className="ghost-btn !px-3 !py-2 text-sm"
                onClick={() => {
                  logout()
                  navigate('/')
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <button className="ghost-btn !px-3 !py-2 text-sm" onClick={() => navigate('/')}>
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
