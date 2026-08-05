import { useCallback, useEffect, useRef, useState } from 'react'
import {
  correctAiGenerationProposal,
  createAiGenerationProposal,
  getAiGenerationUsage,
  type AiQuotaSummary,
} from '../api'
import {
  compileGenerationPlan,
  type AiGenerationProposal,
} from '../ai/compileGenerationPlan'
import {
  AI_GENERATION_CORRECTION_LIMITS,
  AI_GENERATION_MAX_CORRECTIONS,
  parseAppGenerationPlan,
  type AiGenerationPlanIssue,
} from '@apptura/shared/ai'
import type { Project } from '../shared/schema/types'

export const AI_GENERATION_PROMPT_MAX_LENGTH = 2_000

type AiGenerationState = {
  open: boolean
  proposal: AiGenerationProposal | null
  sourceProject: Project | null
  issues: AiGenerationPlanIssue[]
  error: string | null
  warnings: string[]
  quota: AiQuotaSummary | null
  quotaError: string | null
  isGenerating: boolean
  isQuotaLoading: boolean
  refinementAttempt: number
}

const CLOSED_STATE: AiGenerationState = {
  open: false,
  proposal: null,
  sourceProject: null,
  issues: [],
  error: null,
  warnings: [],
  quota: null,
  quotaError: null,
  isGenerating: false,
  isQuotaLoading: false,
  refinementAttempt: 0,
}

export function useAiGeneration(project: Project, projectId?: string) {
  const [state, setState] = useState<AiGenerationState>(CLOSED_STATE)
  const generationRequest = useRef<AbortController | null>(null)
  const usageRequest = useRef<AbortController | null>(null)
  const activeProjectId = useRef(projectId)

  const refreshUsage = useCallback(async () => {
    if (!projectId) {
      setState((current) => ({
        ...current,
        quota: null,
        quotaError: 'Save this project before using AI generation.',
        isQuotaLoading: false,
      }))
      return
    }

    usageRequest.current?.abort()
    const controller = new AbortController()
    usageRequest.current = controller
    setState((current) => ({ ...current, quotaError: null, isQuotaLoading: true }))

    try {
      const usage = await getAiGenerationUsage(projectId, controller.signal)
      if (usageRequest.current !== controller) return
      setState((current) => ({
        ...current,
        quota: readQuota(usage.quota),
        quotaError: null,
        isQuotaLoading: false,
      }))
    } catch (error: unknown) {
      if (isAbortError(error) || usageRequest.current !== controller) return
      setState((current) => ({
        ...current,
        quotaError: 'Generation allowance is temporarily unavailable.',
        isQuotaLoading: false,
      }))
    } finally {
      if (usageRequest.current === controller) usageRequest.current = null
    }
  }, [projectId])

  const openGeneration = useCallback(() => {
    setState({ ...CLOSED_STATE, open: true })
    void refreshUsage()
  }, [refreshUsage])

  const closeGeneration = useCallback(() => {
    generationRequest.current?.abort()
    usageRequest.current?.abort()
    generationRequest.current = null
    usageRequest.current = null
    setState(CLOSED_STATE)
  }, [])

  const generate = useCallback(async (prompt: string) => {
    const normalizedPrompt = prompt.trim()
    if (!projectId) {
      setState((current) => ({
        ...current,
        open: true,
        error: 'Save this project before using AI generation.',
      }))
      return
    }
    if (!normalizedPrompt) {
      setState((current) => ({ ...current, error: 'Describe the page you want to generate.' }))
      return
    }
    if (normalizedPrompt.length > AI_GENERATION_PROMPT_MAX_LENGTH) {
      setState((current) => ({
        ...current,
        error: `Keep the prompt under ${AI_GENERATION_PROMPT_MAX_LENGTH.toLocaleString()} characters.`,
      }))
      return
    }

    generationRequest.current?.abort()
    usageRequest.current?.abort()
    usageRequest.current = null
    const controller = new AbortController()
    generationRequest.current = controller
    const sourceProject = project
    setState((current) => ({
      ...current,
      open: true,
      proposal: null,
      sourceProject,
      issues: [],
      error: null,
      warnings: [],
      quotaError: null,
      isGenerating: true,
      isQuotaLoading: false,
      refinementAttempt: 0,
    }))

    try {
      let response = await createAiGenerationProposal(projectId, normalizedPrompt, {
        scope: 'page',
        signal: controller.signal,
      })
      let warnings = readWarnings(response.warnings)

      for (let correctionAttempt = 0; correctionAttempt <= AI_GENERATION_MAX_CORRECTIONS; correctionAttempt += 1) {
        if (generationRequest.current !== controller) return
        const parsed = parseAppGenerationPlan(response.plan)
        if (!parsed.success) {
          setState((current) => ({
            ...current,
            sourceProject,
            proposal: null,
            issues: parsed.issues,
            quota: readQuota(response.quota) ?? current.quota,
            warnings,
            isGenerating: false,
            refinementAttempt: 0,
          }))
          return
        }

        const compiled = compileGenerationPlan(sourceProject, parsed.data)
        if (compiled.success) {
          setState((current) => ({
            ...current,
            proposal: compiled.proposal,
            sourceProject,
            issues: [],
            error: null,
            warnings,
            quota: readQuota(response.quota) ?? current.quota,
            isGenerating: false,
            refinementAttempt: 0,
          }))
          return
        }

        if (correctionAttempt >= AI_GENERATION_MAX_CORRECTIONS) {
          setState((current) => ({
            ...current,
            sourceProject,
            proposal: null,
            issues: compiled.issues,
            quota: readQuota(response.quota) ?? current.quota,
            warnings,
            isGenerating: false,
            refinementAttempt: 0,
          }))
          return
        }

        const nextAttempt = correctionAttempt + 1
        setState((current) => ({
          ...current,
          issues: [],
          error: null,
          warnings,
          quota: readQuota(response.quota) ?? current.quota,
          refinementAttempt: nextAttempt,
        }))
        response = await correctAiGenerationProposal(projectId, {
          prompt: normalizedPrompt,
          scope: 'page',
          correctionAttempt: nextAttempt,
          previousPlan: parsed.data,
          issues: compiled.issues.slice(0, AI_GENERATION_CORRECTION_LIMITS.maxIssues),
          signal: controller.signal,
        })
        warnings = uniqueWarnings(warnings, readWarnings(response.warnings))
      }
    } catch (error: unknown) {
      if (isAbortError(error) || generationRequest.current !== controller) return
      const apiError = readApiError(error)
      const quota = readQuota(apiError.body?.quota)
      const issues = readIssues(apiError.body?.issues)
      setState((current) => ({
        ...current,
        proposal: null,
        sourceProject,
        issues,
        error: formatGenerationError(apiError),
        quota: quota ?? current.quota,
        isGenerating: false,
        refinementAttempt: 0,
      }))
      if (apiError.status === 422 || apiError.status === 502) void refreshUsage()
    } finally {
      if (generationRequest.current === controller) generationRequest.current = null
    }
  }, [project, projectId, refreshUsage])

  useEffect(() => () => {
    generationRequest.current?.abort()
    usageRequest.current?.abort()
  }, [])

  useEffect(() => {
    if (activeProjectId.current === projectId) return
    activeProjectId.current = projectId
    generationRequest.current?.abort()
    usageRequest.current?.abort()
    generationRequest.current = null
    usageRequest.current = null
    setState(CLOSED_STATE)
  }, [projectId])

  return {
    ...state,
    isStale: Boolean(state.proposal && state.sourceProject !== project),
    promptMaxLength: AI_GENERATION_PROMPT_MAX_LENGTH,
    openGeneration,
    closeGeneration,
    generate,
    refreshUsage,
  }
}

type ApiErrorDetails = {
  status: number | null
  message: string
  body: Record<string, unknown> | null
}

function readApiError(error: unknown): ApiErrorDetails {
  const record = error && typeof error === 'object'
    ? error as Record<string, unknown>
    : null
  const body = record?.body && typeof record.body === 'object' && !Array.isArray(record.body)
    ? record.body as Record<string, unknown>
    : null
  const status = typeof record?.status === 'number' ? record.status : null
  const bodyMessage = typeof body?.error === 'string' ? body.error : null
  const errorMessage = error instanceof Error ? error.message : null
  return {
    status,
    body,
    message: bodyMessage || errorMessage || 'AI generation failed.',
  }
}

function formatGenerationError(error: ApiErrorDetails): string {
  if (error.status === 401) return 'Your builder session expired. Sign in again before generating.'
  if (error.status === 404) return 'This saved project could not be found. Return to the dashboard and reopen it.'
  if (error.status === 429) {
    const quota = readQuota(error.body?.quota)
    const reset = quota ? formatResetTime(quota.resetsAt) : null
    return reset
      ? `You have used the current AI allowance. Try again ${reset}.`
      : 'You have used the current AI allowance. Try again after it resets.'
  }
  if (error.status === 422) return 'The generated plan was invalid and could not be previewed.'
  if (error.status === 502) return 'The AI provider could not generate a valid proposal. Try again.'
  return error.message
}

function readWarnings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((warning): warning is string => typeof warning === 'string' && Boolean(warning.trim()))
}

function uniqueWarnings(...groups: string[][]): string[] {
  return [...new Set(groups.flat())]
}

function readIssues(value: unknown): AiGenerationPlanIssue[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((issue) => {
    if (!issue || typeof issue !== 'object' || Array.isArray(issue)) return []
    const record = issue as Record<string, unknown>
    if (
      typeof record.code !== 'string'
      || typeof record.path !== 'string'
      || typeof record.message !== 'string'
    ) return []
    return [{ code: record.code, path: record.path, message: record.message }]
  })
}

function readQuota(value: unknown): AiQuotaSummary | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const quota = value as Record<string, unknown>
  if (
    typeof quota.limit !== 'number'
    || typeof quota.used !== 'number'
    || typeof quota.remaining !== 'number'
    || typeof quota.resetsAt !== 'string'
  ) return null
  return {
    limit: quota.limit,
    used: quota.used,
    remaining: quota.remaining,
    resetsAt: quota.resetsAt,
  }
}

function formatResetTime(value: string): string | null {
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) return null
  return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}
