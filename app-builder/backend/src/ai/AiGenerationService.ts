import { createHash, randomUUID } from 'node:crypto';
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
import {
  AiModelClientError,
  type AiModelClient,
  type AiModelResult,
  type AiModelTokenUsage,
} from './AiModelClient.js';
import type {
  AiQuotaSummary,
  AiUsageSummary,
  AiUsageTracker,
} from './AiUsageService.js';

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
  generation: {
    provider: string;
    model: string;
    usage: AiModelTokenUsage;
  };
  quota: AiQuotaSummary;
};

type AiGenerationRequest = {
  prompt: string;
  scope: AiGenerationScope;
};

export class AiGenerationService {
  constructor(
    private readonly projects: OwnedProjectReader,
    private readonly model: AiModelClient,
    private readonly usage: AiUsageTracker,
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

    const attempt = await this.usage.beginAttempt({
      ownerId,
      projectId,
      scope: request.scope,
      provider: this.model.providerName,
      model: this.model.modelName,
    });

    let modelResult: AiModelResult;
    try {
      modelResult = await this.model.generatePlan({
        prompt: request.prompt,
        scope: request.scope,
        context: buildAiGenerationContext(project),
        safetyIdentifier: createSafetyIdentifier(ownerId),
      });
    } catch (error) {
      const failure = readModelFailure(error);
      await this.usage.finishAttempt(attempt, {
        status: 'provider_error',
        ...(failure.usage ? { usage: failure.usage } : {}),
        ...(failure.responseId ? { providerResponseId: failure.responseId } : {}),
        ...(failure.code ? { errorCode: failure.code } : {}),
      });
      throw new AiModelProviderError(error);
    }

    let plan: AppGenerationPlanV1;
    try {
      plan = validateProviderPlan(modelResult.plan, request.scope);
    } catch (error) {
      await this.usage.finishAttempt(attempt, {
        status: 'invalid_output',
        ...(modelResult.usage ? { usage: modelResult.usage } : {}),
        ...(modelResult.responseId ? { providerResponseId: modelResult.responseId } : {}),
        errorCode: 'invalid_generation_plan',
      });
      throw error;
    }

    const proposalId = this.createProposalId();
    await this.usage.finishAttempt(attempt, {
      status: 'succeeded',
      ...(modelResult.usage ? { usage: modelResult.usage } : {}),
      ...(modelResult.responseId ? { providerResponseId: modelResult.responseId } : {}),
    });

    return {
      proposalId,
      planVersion: plan.planVersion,
      capabilityCatalogVersion: AI_GENERATION_CAPABILITIES.catalogVersion,
      contextRevision: getContextRevision(project),
      summary: plan.summary,
      plan,
      warnings: [],
      generation: {
        provider: this.model.providerName,
        model: this.model.modelName,
        usage: modelResult.usage ?? emptyTokenUsage(),
      },
      quota: attempt.quota,
    };
  }

  async getUsage(ownerId: string, projectId: string): Promise<AiUsageSummary> {
    const project = await this.projects.findOwned(projectId, ownerId);
    if (!project) throw new ProjectNotFoundError();
    return this.usage.getSummary(ownerId, projectId);
  }
}

function createSafetyIdentifier(ownerId: string): string {
  return createHash('sha256').update(`apptura-builder:${ownerId}`).digest('hex');
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

function validateProviderPlan(value: unknown, scope: AiGenerationScope): AppGenerationPlanV1 {
  assertProviderOutputSize(value);
  const parsed = parseAppGenerationPlan(value);
  if (!parsed.success) {
    throw new AiGenerationOutputError(
      'The AI provider returned an invalid generation plan.',
      parsed.issues,
    );
  }
  if (parsed.data.scope !== scope) {
    throw new AiGenerationOutputError(
      'The AI provider returned a plan for the wrong generation scope.',
      [{
        code: 'scope-mismatch',
        path: '$.scope',
        message: `Expected scope "${scope}".`,
      }],
    );
  }
  return parsed.data;
}

function readModelFailure(error: unknown): {
  usage?: AiModelTokenUsage;
  responseId?: string;
  code?: string;
} {
  if (error instanceof AiModelClientError) {
    return {
      ...(error.usage ? { usage: error.usage } : {}),
      ...(error.responseId ? { responseId: error.responseId } : {}),
      ...(error.code ? { code: sanitizeErrorCode(error.code) } : {}),
    };
  }
  if (!error || typeof error !== 'object') return {};
  const code = (error as Record<string, unknown>).code;
  return typeof code === 'string' && code
    ? { code: sanitizeErrorCode(code) }
    : {};
}

function sanitizeErrorCode(code: string): string {
  const normalized = code.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 80);
  return normalized || 'provider_error';
}

function emptyTokenUsage(): AiModelTokenUsage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    cachedInputTokens: 0,
    reasoningOutputTokens: 0,
  };
}

function getContextRevision(project: ProjectRecord): string | null {
  if (!(project.updatedAt instanceof Date) || Number.isNaN(project.updatedAt.getTime())) return null;
  return project.updatedAt.toISOString();
}
