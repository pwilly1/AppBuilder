import { useEffect, useMemo, useState } from 'react'
import {
  AI_GENERATION_MAX_CORRECTIONS,
  type AiGenerationPlanIssue,
} from '@apptura/shared/ai'
import type { AiQuotaSummary } from '../../api'
import type { AiGenerationProposal } from '../../ai/compileGenerationPlan'
import { PageRenderer } from '../../editor/PageRenderer'

type Props = {
  open: boolean
  proposal: AiGenerationProposal | null
  issues: AiGenerationPlanIssue[]
  error: string | null
  warnings: string[]
  quota: AiQuotaSummary | null
  quotaError: string | null
  isGenerating: boolean
  isQuotaLoading: boolean
  refinementAttempt: number
  isStale: boolean
  promptMaxLength: number
  onClose: () => void
  onGenerate: (prompt: string) => void
  onAccept: () => void
}

export function AiGenerateDialog({
  open,
  proposal,
  issues,
  error,
  warnings,
  quota,
  quotaError,
  isGenerating,
  isQuotaLoading,
  refinementAttempt,
  isStale,
  promptMaxLength,
  onClose,
  onGenerate,
  onAccept,
}: Props) {
  const generatedPages = useMemo(
    () => proposal?.project.pages.filter((page) => proposal.generatedPageIds.includes(page.id)) ?? [],
    [proposal],
  )
  const [previewPageId, setPreviewPageId] = useState<string>('')
  const [prompt, setPrompt] = useState('')
  const previewPage = generatedPages.find((page) => page.id === previewPageId) ?? generatedPages[0]
  const atLimit = quota?.remaining === 0
  const canGenerate = Boolean(prompt.trim()) && !isGenerating && !atLimit

  useEffect(() => {
    setPreviewPageId(generatedPages[0]?.id ?? '')
  }, [generatedPages])

  useEffect(() => {
    if (!open) setPrompt('')
  }, [open])

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
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-[#fffbf5] shadow-2xl"
        role="dialog"
      >
        <header className="flex shrink-0 flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-[#fffbf5] px-6 py-5">
          <div>
            <div className="editor-section-title">AI app builder</div>
            <h2 id="ai-generation-title" className="mt-1 text-2xl font-semibold text-slate-950">
              Generate a page
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Describe one page. Apptura will validate the result and show an isolated preview before anything
              enters your project.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button type="button" className="ghost-btn !px-4 !py-2 text-sm" onClick={onClose}>
              Close
            </button>
            <QuotaStatus quota={quota} loading={isQuotaLoading} error={quotaError} />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <form
            className="border-b border-slate-200 bg-white/55 px-6 py-5"
            onSubmit={(event) => {
              event.preventDefault()
              if (canGenerate) onGenerate(prompt)
            }}
          >
          <div className="flex flex-wrap items-end gap-4">
            <label className="min-w-[280px] flex-1">
              <span className="text-sm font-semibold text-slate-900">What should this page do?</span>
              <textarea
                className="mt-2 min-h-28 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                maxLength={promptMaxLength}
                placeholder="Example: Create a crew directory page with a searchable-looking list of team members, their roles, and a button to add a new member."
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                disabled={isGenerating}
                autoFocus
              />
              <span className="mt-1 flex justify-between gap-3 text-xs text-slate-500">
                <span>Include the purpose, content, and actions you need. You can refine the result later.</span>
                <span>{prompt.length.toLocaleString()} / {promptMaxLength.toLocaleString()}</span>
              </span>
            </label>
            <button type="submit" className="btn min-w-40" disabled={!canGenerate}>
              {isGenerating
                ? refinementAttempt > 0 ? 'Refining...' : 'Generating...'
                : proposal ? 'Generate again' : 'Generate page'}
            </button>
          </div>
          {atLimit ? (
            <p className="mt-3 text-sm font-medium text-amber-800">
              Your current AI allowance is used. You can generate again after it resets.
            </p>
          ) : null}
          </form>

          <div aria-live="polite">
          {isGenerating ? (
            <div className="p-6">
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
                <div className="text-sm font-semibold text-blue-900">
                  {refinementAttempt > 0
                    ? `Refining the layout (${refinementAttempt}/${AI_GENERATION_MAX_CORRECTIONS})...`
                    : 'Building a validated proposal...'}
                </div>
                <p className="mt-2 text-sm leading-6 text-blue-800">
                  {refinementAttempt > 0
                    ? 'Apptura sent the compiler diagnostics back for a safer layout without dropping blocks or adding pages.'
                    : 'The model is drafting a plan. Apptura will parse, compile, repair, and validate it before preview.'}
                </p>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="px-6 pt-6">
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
                <h3 className="font-semibold">Generation failed</h3>
                <p className="mt-2 leading-6">{error}</p>
              </div>
            </div>
          ) : null}

          {issues.length ? (
            <div className="px-6 pt-6">
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                <h3 className="font-semibold text-red-900">The proposal could not be compiled</h3>
                <div className="mt-3 space-y-2">
                  {issues.map((issue, index) => (
                    <div key={`${issue.code}:${issue.path}:${index}`} className="text-sm text-red-800">
                      <span className="font-semibold">{issue.path}:</span> {issue.message}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {proposal && !isGenerating ? (
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
                    <div className="mt-3 space-y-3 text-sm text-slate-600">
                      <div>
                        <div className="font-semibold text-slate-800">Pages</div>
                        <p>{proposal.plan.pages.map((page) => page.title).join(', ')}</p>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">Data collections</div>
                        <p>
                          {proposal.plan.collections.length
                            ? proposal.plan.collections.map((collection) => collection.name).join(', ')
                            : 'No new collections'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {warnings.length ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                      <h3 className="font-semibold text-amber-900">Proposal warnings</h3>
                      <div className="mt-3 space-y-2 text-sm leading-6 text-amber-800">
                        {warnings.map((warning, index) => <p key={`${warning}:${index}`}>{warning}</p>)}
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="font-semibold text-slate-900">Layout validation</h3>
                    {proposal.repairs.length ? (
                      <div className="mt-3 space-y-2 text-sm text-amber-800">
                        {proposal.repairs.map((repair, index) => (
                          <p key={`${repair.pageKey}:${repair.blockKey}:${index}`}>
                            {repair.blockKey}: {repair.reason === 'clamped-to-grid'
                              ? 'clamped inside its grid'
                              : repair.reason === 'expanded-to-fit-content'
                                ? 'expanded so its content fits'
                                : repair.reason === 'reflowed-to-fit-page'
                                  ? 'reflowed with nearby blocks so the page fits'
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
                      The project changed after this proposal was created. Generate it again before applying.
                    </div>
                  ) : null}
                </aside>

                <div className="min-w-0 rounded-2xl border border-slate-200 bg-[#f7f1e6] p-4 shadow-inner">
                  <div className="mb-4 flex flex-wrap gap-2">
                    {generatedPages.map((page) => (
                      <button
                        key={page.id}
                        type="button"
                        className={page.id === previewPage?.id
                          ? 'btn !px-4 !py-2 text-sm'
                          : 'ghost-btn !px-4 !py-2 text-sm'}
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

            </>
          ) : null}

          {!proposal && !isGenerating && !error && !issues.length ? (
            <div className="p-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-6 text-slate-600 shadow-sm">
                No project data changes when you generate. Review the compiled page here, then explicitly apply or
                close the dialog.
              </div>
            </div>
          ) : null}
          </div>
        </div>

        {proposal && !isGenerating ? (
          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-[#fffbf5] px-6 py-4">
            <p className="text-sm text-slate-500">
              Applying creates one undoable history entry. Your existing project is unchanged until then.
            </p>
            <button
              type="button"
              className="btn !px-5 !py-2 text-sm"
              onClick={onAccept}
              disabled={isStale || isGenerating}
            >
              Apply proposal
            </button>
          </footer>
        ) : null}
      </section>
    </div>
  )
}

function QuotaStatus({
  quota,
  loading,
  error,
}: {
  quota: AiQuotaSummary | null
  loading: boolean
  error: string | null
}) {
  if (loading) return <span className="text-xs text-slate-500">Checking generation allowance...</span>
  if (error) return <span className="max-w-64 text-right text-xs text-amber-700">{error}</span>
  if (!quota) return null
  const reset = formatResetTime(quota.resetsAt)
  return (
    <span className="text-right text-xs text-slate-500">
      {quota.remaining} of {quota.limit} generations remaining{reset ? ` | resets ${reset}` : ''}
    </span>
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

function formatResetTime(value: string): string | null {
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) return null
  return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}
