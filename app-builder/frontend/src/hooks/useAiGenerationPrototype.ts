import { useState } from 'react'
import {
  compileGenerationPlan,
  type AiGenerationProposal,
} from '../ai/compileGenerationPlan'
import { CREW_DIRECTORY_GENERATION_PLAN } from '../ai/fixtures/crewDirectoryPlan'
import { parseAppGenerationPlan } from '../ai/parseGenerationPlan'
import type { AiGenerationPlanIssue } from '../ai/aiTypes'
import type { Project } from '../shared/schema/types'

type PrototypeState = {
  open: boolean
  proposal: AiGenerationProposal | null
  sourceProject: Project | null
  issues: AiGenerationPlanIssue[]
}

const CLOSED_STATE: PrototypeState = {
  open: false,
  proposal: null,
  sourceProject: null,
  issues: [],
}

export function useAiGenerationPrototype(project: Project) {
  const [state, setState] = useState<PrototypeState>(CLOSED_STATE)

  function openPrototype() {
    setState(buildProposalState(project))
  }

  function regeneratePrototype() {
    setState(buildProposalState(project))
  }

  function closePrototype() {
    setState(CLOSED_STATE)
  }

  return {
    ...state,
    isStale: Boolean(state.proposal && state.sourceProject !== project),
    openPrototype,
    regeneratePrototype,
    closePrototype,
  }
}

function buildProposalState(project: Project): PrototypeState {
  const rawFixture: unknown = JSON.parse(JSON.stringify(CREW_DIRECTORY_GENERATION_PLAN))
  const parsed = parseAppGenerationPlan(rawFixture)
  if (!parsed.success) {
    return {
      open: true,
      proposal: null,
      sourceProject: project,
      issues: parsed.issues,
    }
  }

  try {
    const compiled = compileGenerationPlan(project, parsed.data)
    if (!compiled.success) {
      return {
        open: true,
        proposal: null,
        sourceProject: project,
        issues: compiled.issues,
      }
    }
    return {
      open: true,
      proposal: compiled.proposal,
      sourceProject: project,
      issues: [],
    }
  } catch (error: unknown) {
    return {
      open: true,
      proposal: null,
      sourceProject: project,
      issues: [{
        code: 'generation-failed',
        path: '$',
        message: error instanceof Error ? error.message : 'The sample proposal could not be generated.',
      }],
    }
  }
}
