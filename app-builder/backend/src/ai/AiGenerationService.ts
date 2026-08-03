import { randomUUID } from 'node:crypto';
import {
  AI_GENERATION_CAPABILITIES,
  AI_GENERATION_SUPPORTED_SCOPES,
  parseAppGenerationPlan,
  type AiGenerationScope,
  type AppGenerationPlanV1,
} from '@apptura/shared/ai';
import type { ProjectRecord } from '../repositories/ProjectRepository.js';
import {
  ProjectNotFoundError,
  type ProjectManager,
} from '../services/ProjectManager.js';
import { buildAiGenerationContext } from './AiContextBuilder.js';
import {
  AiGenerationOutputError,
  AiGenerationRequestError,
  AiModelProviderError,
} from './AiGenerationErrors.js';
import type { AiModelClient } from './AiModelClient.js';

const AI_PROMPT_MAX_LENGTH = 2_000;
const AI_PROVIDER_OUTPUT_MAX_BYTES = 256 * 1024;

type OwnedProjectReader = Pick<ProjectManager, 'findOwned'>;

export type AiGenerationProposal = {
  proposalId: string;
  planVersion: number;
  capabilityCatalogVersion: number;
  contextRevision: string | null;
  summary: string;
  plan: AppGenerationPlanV1;
  warnings: string[];
};

type AiGenerationRequest = {
  prompt: string;
  scope: AiGenerationScope;
};

export class AiGenerationService {
  constructor(
    private readonly projects: OwnedProjectReader,
    private readonly model: AiModelClient,
    private readonly createProposalId: () => string = randomUUID,
  ) {}

  async generateProposal(
    ownerId: string,
    projectId: string,
    input: unknown,
  ): Promise<AiGenerationProposal> {
    const request = parseGenerationRequest(input);
    const project = await this.projects.findOwned(projectId, ownerId);
    if (!project) throw new ProjectNotFoundError();

    let rawPlan: unknown;
    try {
      rawPlan = await this.model.generatePlan({
        prompt: request.prompt,
        scope: request.scope,
        context: buildAiGenerationContext(project),
      });
    } catch (error) {
      throw new AiModelProviderError(error);
    }

    assertProviderOutputSize(rawPlan);
    const parsed = parseAppGenerationPlan(rawPlan);
    if (!parsed.success) {
      throw new AiGenerationOutputError(
        'The AI provider returned an invalid generation plan.',
        parsed.issues,
      );
    }
    if (parsed.data.scope !== request.scope) {
      throw new AiGenerationOutputError(
        'The AI provider returned a plan for the wrong generation scope.',
        [{
          code: 'scope-mismatch',
          path: '$.scope',
          message: `Expected scope "${request.scope}".`,
        }],
      );
    }

    return {
      proposalId: this.createProposalId(),
      planVersion: parsed.data.planVersion,
      capabilityCatalogVersion: AI_GENERATION_CAPABILITIES.catalogVersion,
      contextRevision: getContextRevision(project),
      summary: parsed.data.summary,
      plan: parsed.data,
      warnings: [],
    };
  }
}

function parseGenerationRequest(input: unknown): AiGenerationRequest {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AiGenerationRequestError('A generation request body is required.');
  }
  const body = input as Record<string, unknown>;
  const unknownKey = Object.keys(body).find((key) => key !== 'prompt' && key !== 'scope');
  if (unknownKey) {
    throw new AiGenerationRequestError(`Unsupported request property "${unknownKey}".`);
  }

  if (typeof body.prompt !== 'string' || !body.prompt.trim()) {
    throw new AiGenerationRequestError('Prompt is required.');
  }
  const prompt = body.prompt.trim();
  if (prompt.length > AI_PROMPT_MAX_LENGTH) {
    throw new AiGenerationRequestError(`Prompt must be ${AI_PROMPT_MAX_LENGTH} characters or fewer.`);
  }

  const scopeValue = body.scope ?? 'page';
  if (
    typeof scopeValue !== 'string'
    || !AI_GENERATION_SUPPORTED_SCOPES.includes(scopeValue as AiGenerationScope)
  ) {
    throw new AiGenerationRequestError(
      `Scope must be one of: ${AI_GENERATION_SUPPORTED_SCOPES.join(', ')}.`,
    );
  }

  return { prompt, scope: scopeValue as AiGenerationScope };
}

function assertProviderOutputSize(value: unknown): void {
  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(value);
  } catch {
    serialized = undefined;
  }
  if (!serialized) {
    throw new AiGenerationOutputError(
      'The AI provider returned an unreadable generation plan.',
      [{ code: 'invalid-output', path: '$', message: 'Expected a JSON-compatible object.' }],
    );
  }
  if (Buffer.byteLength(serialized, 'utf8') > AI_PROVIDER_OUTPUT_MAX_BYTES) {
    throw new AiGenerationOutputError(
      'The AI provider returned a generation plan that was too large.',
      [{ code: 'output-too-large', path: '$', message: 'Generation plan exceeds the output limit.' }],
    );
  }
}

function getContextRevision(project: ProjectRecord): string | null {
  if (!(project.updatedAt instanceof Date) || Number.isNaN(project.updatedAt.getTime())) return null;
  return project.updatedAt.toISOString();
}
