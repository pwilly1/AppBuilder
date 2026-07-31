import { useEffect, useMemo, useState } from 'react'
import type { AiGenerationProposal } from '../../ai/compileGenerationPlan'
import type { AiGenerationPlanIssue } from '../../ai/aiTypes'
import { PageRenderer } from '../../editor/PageRenderer'

type Props = {
  open: boolean
  proposal: AiGenerationProposal | null
  issues: AiGenerationPlanIssue[]
  isStale: boolean
  onClose: () => void
  onRegenerate: () => void
  onAccept: () => void
}

export function AiGenerateDialog({
  open,
  proposal,
  issues,
  isStale,
  onClose,
  onRegenerate,
  onAccept,
}: Props) {
  const generatedPages = useMemo(
    () => proposal?.project.pages.filter((page) => proposal.generatedPageIds.includes(page.id)) ?? [],
    [proposal],
  )
  const [previewPageId, setPreviewPageId] = useState<string>('')
  const previewPage = generatedPages.find((page) => page.id === previewPageId) ?? generatedPages[0]

  useEffect(() => {
    setPreviewPageId(generatedPages[0]?.id ?? '')
  }, [generatedPages])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        aria-labelledby="ai-generation-title"
        aria-modal="true"
        className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] border border-slate-200 bg-[#fffbf5] shadow-2xl"
        role="dialog"
      >
        <header className="sticky top-0 z-10 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-[#fffbf5]/95 px-6 py-5 backdrop-blur">
          <div>
            <div className="editor-section-title">AI generation foundation</div>
            <h2 id="ai-generation-title" className="mt-1 text-2xl font-semibold text-slate-950">
              Crew Directory proposal
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              This milestone uses a deterministic sample plan rather than a model call. It exercises the same
              validation, compilation, preview, and project-history path that model output will use later.
            </p>
          </div>
          <button type="button" className="ghost-btn !px-4 !py-2 text-sm" onClick={onClose}>
            Close
          </button>
        </header>

        {issues.length ? (
          <div className="p-6">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <h3 className="font-semibold text-red-900">The sample plan could not be compiled</h3>
              <div className="mt-3 space-y-2">
                {issues.map((issue, index) => (
                  <div key={`${issue.code}:${issue.path}:${index}`} className="text-sm text-red-800">
                    <span className="font-semibold">{issue.path}:</span> {issue.message}
                  </div>
                ))}
              </div>
              <button type="button" className="btn mt-5" onClick={onRegenerate}>
                Try again
              </button>
            </div>
          </div>
        ) : proposal ? (
          <>
            <div className="grid gap-6 p-6 lg:grid-cols-[minmax(250px,0.72fr)_minmax(460px,1.28fr)]">
              <aside className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                    Proposal summary
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{proposal.plan.summary}</p>
                  <dl className="mt-5 grid grid-cols-3 gap-2">
                    <ProposalMetric label="Pages" value={proposal.generatedPageIds.length} />
                    <ProposalMetric label="Collections" value={proposal.generatedCollectionIds.length} />
                    <ProposalMetric label="Blocks" value={proposal.generatedBlockCount} />
                  </dl>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="font-semibold text-slate-900">What will be added</h3>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <p>Two new pages with unique paths.</p>
                    <p>One Crew Members collection with Name and Role fields.</p>
                    <p>A Collection List using current-item bindings.</p>
                    <p>Navigation and mapped data-submission actions.</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="font-semibold text-slate-900">Layout validation</h3>
                  {proposal.repairs.length ? (
                    <div className="mt-3 space-y-2 text-sm text-amber-800">
                      {proposal.repairs.map((repair, index) => (
                        <p key={`${repair.pageKey}:${repair.blockKey}:${index}`}>
                          {repair.blockKey}: {repair.reason === 'clamped-to-grid'
                            ? 'clamped inside its grid'
                            : 'moved to the nearest free area'}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-emerald-700">
                      All proposed coordinates passed without repair.
                    </p>
                  )}
                </div>

                {isStale ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
                    The project changed after this proposal was created. Regenerate it before applying.
                  </div>
                ) : null}
              </aside>

              <div className="min-w-0 rounded-2xl border border-slate-200 bg-[#f7f1e6] p-4 shadow-inner">
                <div className="mb-4 flex flex-wrap gap-2">
                  {generatedPages.map((page) => (
                    <button
                      key={page.id}
                      type="button"
                      className={page.id === previewPage?.id ? 'btn !px-4 !py-2 text-sm' : 'ghost-btn !px-4 !py-2 text-sm'}
                      onClick={() => setPreviewPageId(page.id)}
                    >
                      {page.title || 'Untitled Page'}
                    </button>
                  ))}
                </div>
                {previewPage ? (
                  <div className="pointer-events-none overflow-x-auto rounded-2xl bg-white/55 py-3">
                    <PageRenderer
                      page={previewPage}
                      dataCollections={proposal.project.dataCollections}
                      previewMode
                      previewPlaceholderData
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <footer className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-[#fffbf5]/95 px-6 py-4 backdrop-blur">
              <p className="text-sm text-slate-500">
                Applying creates one undoable project-history entry. It does not save directly.
              </p>
              <div className="flex gap-2">
                <button type="button" className="ghost-btn !px-4 !py-2 text-sm" onClick={onRegenerate}>
                  Regenerate sample
                </button>
                <button type="button" className="btn !px-5 !py-2 text-sm" onClick={onAccept} disabled={isStale}>
                  Apply proposal
                </button>
              </div>
            </footer>
          </>
        ) : null}
      </section>
    </div>
  )
}

function ProposalMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col rounded-xl bg-slate-50 px-3 py-3 text-center">
      <dt className="order-2 mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </dt>
      <dd className="order-1 text-xl font-semibold text-slate-950">{value}</dd>
    </div>
  )
}
