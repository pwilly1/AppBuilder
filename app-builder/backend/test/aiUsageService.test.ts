import assert from 'node:assert/strict';
import test from 'node:test';
import { AiGenerationRateLimitError } from '../src/ai/AiGenerationErrors.js';
import { AiUsageService } from '../src/ai/AiUsageService.js';
import type {
  AiQuotaReservation,
  AiUsageRepository,
  AiUsageTotals,
  CompleteAiUsageAttemptInput,
  CreateAiUsageAttemptInput,
} from '../src/repositories/AiUsageRepository.js';
import { emptyAiUsageTotals } from '../src/repositories/AiUsageRepository.js';

const NOW = new Date('2026-08-04T12:15:00.000Z');

test('AI quota is enforced atomically per builder account', async () => {
  const repository = new MemoryAiUsageRepository();
  const ids = ['request-1', 'request-2', 'request-3', 'request-4'];
  const service = new AiUsageService(
    repository,
    { requestsPerHour: 2, summaryDays: 30 },
    () => new Date(NOW),
    () => ids.shift() ?? 'unexpected-request',
  );

  const first = await service.beginAttempt(generationInput('owner-1'));
  const second = await service.beginAttempt(generationInput('owner-1'));
  assert.equal(first.quota.remaining, 1);
  assert.equal(second.quota.remaining, 0);

  await assert.rejects(
    service.beginAttempt(generationInput('owner-1')),
    (error) => {
      assert.ok(error instanceof AiGenerationRateLimitError);
      assert.equal(error.quota.limit, 2);
      assert.equal(error.quota.used, 2);
      return true;
    },
  );

  const otherOwner = await service.beginAttempt(generationInput('owner-2'));
  assert.equal(otherOwner.quota.remaining, 1);
  assert.equal(repository.attempts.size, 3);
});

test('AI usage completion stores tokens and reports account and project totals', async () => {
  const repository = new MemoryAiUsageRepository();
  const service = new AiUsageService(
    repository,
    { requestsPerHour: 20, summaryDays: 30 },
    () => new Date(NOW),
    () => 'request-1',
  );
  const attempt = await service.beginAttempt(generationInput('owner-1'));

  await service.finishAttempt(attempt, {
    status: 'succeeded',
    usage: {
      inputTokens: 100,
      outputTokens: 40,
      totalTokens: 140,
      cachedInputTokens: 25,
      reasoningOutputTokens: 10,
    },
    providerResponseId: 'resp-1',
  });

  const summary = await service.getSummary('owner-1', 'project-1');
  assert.equal(summary.quota.used, 1);
  assert.equal(summary.account.requests, 1);
  assert.equal(summary.account.succeeded, 1);
  assert.equal(summary.account.totalTokens, 140);
  assert.equal(summary.project.cachedInputTokens, 25);
  assert.equal(repository.attempts.get('request-1')?.completion?.providerResponseId, 'resp-1');
});

test('AI quota is released when the attempt audit record cannot be created', async () => {
  const repository = new MemoryAiUsageRepository();
  repository.failAttemptCreation = true;
  const service = new AiUsageService(
    repository,
    { requestsPerHour: 1, summaryDays: 30 },
    () => new Date(NOW),
    () => repository.failAttemptCreation ? 'failed-request' : 'successful-request',
  );

  await assert.rejects(
    service.beginAttempt(generationInput('owner-1')),
    /audit write failed/,
  );
  assert.equal(repository.quotaUsed('owner-1'), 0);

  repository.failAttemptCreation = false;
  const attempt = await service.beginAttempt(generationInput('owner-1'));
  assert.equal(attempt.quota.remaining, 0);
});

function generationInput(ownerId: string) {
  return {
    ownerId,
    projectId: 'project-1',
    scope: 'page' as const,
    provider: 'openai',
    model: 'gpt-test',
  };
}

type StoredAttempt = CreateAiUsageAttemptInput & {
  createdAt: Date;
  completion?: CompleteAiUsageAttemptInput;
};

class MemoryAiUsageRepository implements AiUsageRepository {
  readonly attempts = new Map<string, StoredAttempt>();
  readonly quotas = new Map<string, number>();
  failAttemptCreation = false;

  async consumeQuota(input: {
    ownerId: string;
    reservationId: string;
    windowStart: Date;
    resetsAt: Date;
    limit: number;
  }): Promise<AiQuotaReservation> {
    const key = quotaKey(input.ownerId, input.windowStart);
    const used = this.quotas.get(key) ?? 0;
    if (used >= input.limit) return { accepted: false, used };
    this.quotas.set(key, used + 1);
    return { accepted: true, used: used + 1 };
  }

  async releaseQuota(ownerId: string, windowStart: Date): Promise<void> {
    const key = quotaKey(ownerId, windowStart);
    this.quotas.set(key, Math.max(0, (this.quotas.get(key) ?? 0) - 1));
  }

  async getQuotaUsed(ownerId: string, windowStart: Date): Promise<number> {
    return this.quotas.get(quotaKey(ownerId, windowStart)) ?? 0;
  }

  async createAttempt(input: CreateAiUsageAttemptInput): Promise<void> {
    if (this.failAttemptCreation) throw new Error('audit write failed');
    this.attempts.set(input.requestId, { ...input, createdAt: new Date(NOW) });
  }

  async completeAttempt(
    requestId: string,
    input: CompleteAiUsageAttemptInput,
  ): Promise<void> {
    const attempt = this.attempts.get(requestId);
    if (!attempt) throw new Error('missing attempt');
    attempt.completion = input;
  }

  async summarize(ownerId: string, since: Date, projectId?: string): Promise<AiUsageTotals> {
    const totals = emptyAiUsageTotals();
    for (const attempt of this.attempts.values()) {
      if (attempt.ownerId !== ownerId || attempt.createdAt < since) continue;
      if (projectId && attempt.projectId !== projectId) continue;
      totals.requests += 1;
      if (!attempt.completion) {
        totals.inProgress += 1;
        continue;
      }
      if (attempt.completion.status === 'succeeded') totals.succeeded += 1;
      else totals.failed += 1;
      totals.inputTokens += attempt.completion.inputTokens;
      totals.outputTokens += attempt.completion.outputTokens;
      totals.totalTokens += attempt.completion.totalTokens;
      totals.cachedInputTokens += attempt.completion.cachedInputTokens;
      totals.reasoningOutputTokens += attempt.completion.reasoningOutputTokens;
    }
    return totals;
  }

  quotaUsed(ownerId: string): number {
    return [...this.quotas.entries()]
      .filter(([key]) => key.startsWith(`${ownerId}:`))
      .reduce((sum, [, used]) => sum + used, 0);
  }
}

function quotaKey(ownerId: string, windowStart: Date): string {
  return `${ownerId}:${windowStart.toISOString()}`;
}
