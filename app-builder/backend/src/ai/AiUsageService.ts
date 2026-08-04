import { randomUUID } from 'node:crypto';
import type { AiGenerationScope } from '@apptura/shared/ai';
import type {
  AiModelTokenUsage,
} from './AiModelClient.js';
import type { AiUsageConfig } from './AiUsageConfig.js';
import { AiGenerationRateLimitError } from './AiGenerationErrors.js';
import type {
  AiUsageRepository,
  AiUsageTotals,
  CompleteAiUsageAttemptInput,
} from '../repositories/AiUsageRepository.js';

const ONE_HOUR_MS = 60 * 60 * 1_000;
const ONE_DAY_MS = 24 * 60 * 60 * 1_000;

export type AiQuotaSummary = {
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
};

export type AiUsageAttempt = {
  requestId: string;
  startedAt: Date;
  quota: AiQuotaSummary;
};

export type AiUsageCompletion = {
  status: CompleteAiUsageAttemptInput['status'];
  usage?: AiModelTokenUsage;
  providerResponseId?: string;
  errorCode?: string;
};

export type AiUsageSummary = {
  quota: AiQuotaSummary;
  periodStart: string;
  account: AiUsageTotals;
  project: AiUsageTotals;
};

export interface AiUsageTracker {
  beginAttempt(input: {
    ownerId: string;
    projectId: string;
    scope: AiGenerationScope;
    provider: string;
    model: string;
  }): Promise<AiUsageAttempt>;
  finishAttempt(attempt: AiUsageAttempt, completion: AiUsageCompletion): Promise<void>;
  getSummary(ownerId: string, projectId: string): Promise<AiUsageSummary>;
}

export class AiUsageService implements AiUsageTracker {
  constructor(
    private readonly repository: AiUsageRepository,
    private readonly config: AiUsageConfig,
    private readonly now: () => Date = () => new Date(),
    private readonly createRequestId: () => string = randomUUID,
  ) {}

  async beginAttempt(input: {
    ownerId: string;
    projectId: string;
    scope: AiGenerationScope;
    provider: string;
    model: string;
  }): Promise<AiUsageAttempt> {
    const startedAt = this.now();
    const { windowStart, resetsAt } = currentQuotaWindow(startedAt);
    const requestId = this.createRequestId();
    const reservation = await this.repository.consumeQuota({
      ownerId: input.ownerId,
      reservationId: requestId,
      windowStart,
      resetsAt,
      limit: this.config.requestsPerHour,
    });
    const quota = createQuotaSummary(
      this.config.requestsPerHour,
      reservation.used,
      resetsAt,
    );
    if (!reservation.accepted) {
      throw new AiGenerationRateLimitError(quota);
    }

    try {
      await this.repository.createAttempt({
        requestId,
        ownerId: input.ownerId,
        projectId: input.projectId,
        scope: input.scope,
        provider: input.provider,
        model: input.model,
      });
    } catch (error) {
      await this.repository.releaseQuota(input.ownerId, windowStart);
      throw error;
    }

    return { requestId, startedAt, quota };
  }

  async finishAttempt(attempt: AiUsageAttempt, completion: AiUsageCompletion): Promise<void> {
    const finishedAt = this.now();
    const usage = completion.usage ?? emptyTokenUsage();
    try {
      await this.repository.completeAttempt(attempt.requestId, {
        status: completion.status,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        cachedInputTokens: usage.cachedInputTokens,
        reasoningOutputTokens: usage.reasoningOutputTokens,
        durationMs: Math.max(0, finishedAt.getTime() - attempt.startedAt.getTime()),
        ...(completion.providerResponseId
          ? { providerResponseId: completion.providerResponseId }
          : {}),
        ...(completion.errorCode ? { errorCode: completion.errorCode } : {}),
        finishedAt,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown persistence error';
      console.error(`Failed to finalize AI usage record ${attempt.requestId}: ${message}`);
    }
  }

  async getSummary(ownerId: string, projectId: string): Promise<AiUsageSummary> {
    const now = this.now();
    const { windowStart, resetsAt } = currentQuotaWindow(now);
    const periodStart = new Date(now.getTime() - this.config.summaryDays * ONE_DAY_MS);
    const [used, account, project] = await Promise.all([
      this.repository.getQuotaUsed(ownerId, windowStart),
      this.repository.summarize(ownerId, periodStart),
      this.repository.summarize(ownerId, periodStart, projectId),
    ]);
    return {
      quota: createQuotaSummary(this.config.requestsPerHour, used, resetsAt),
      periodStart: periodStart.toISOString(),
      account,
      project,
    };
  }
}

function currentQuotaWindow(now: Date): { windowStart: Date; resetsAt: Date } {
  const startMs = Math.floor(now.getTime() / ONE_HOUR_MS) * ONE_HOUR_MS;
  return {
    windowStart: new Date(startMs),
    resetsAt: new Date(startMs + ONE_HOUR_MS),
  };
}

function createQuotaSummary(limit: number, used: number, resetsAt: Date): AiQuotaSummary {
  const boundedUsed = Math.min(Math.max(used, 0), limit);
  return {
    limit,
    used: boundedUsed,
    remaining: Math.max(0, limit - boundedUsed),
    resetsAt: resetsAt.toISOString(),
  };
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
