// Copyright 2025 Preston Willis. All rights reserved.
export default function Footer() {
  return (
    <footer className="w-full px-4 pb-6 pt-1 text-slate-600">
      <div className="shell-panel mx-auto flex max-w-[var(--max-width)] flex-col items-start justify-between gap-2 rounded-[1.5rem] px-5 py-4 text-xs sm:flex-row sm:items-center sm:text-sm">
        <div>
          <div className="font-semibold text-slate-800">Apptura</div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Native app builder</div>
        </div>
        <div className="text-slate-500">(c) 2025 Preston Willis. All rights reserved.</div>
      </div>
    </footer>
  )
}
