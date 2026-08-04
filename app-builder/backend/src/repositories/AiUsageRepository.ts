import { AiQuotaBucketModel } from '../models/AiQuotaBucket.js';
import {
  AiUsageRecordModel,
  type AiUsageStatus,
} from '../models/AiUsageRecord.js';

const QUOTA_BUCKET_RETENTION_MS = 24 * 60 * 60 * 1_000;

export type AiQuotaReservation = {
  accepted: boolean;
  used: number;
};

export type CreateAiUsageAttemptInput = {
  requestId: string;
  ownerId: string;
  projectId: string;
  scope: 'page';
  provider: string;
  model: string;
};

export type CompleteAiUsageAttemptInput = {
  status: Exclude<AiUsageStatus, 'started'>;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedInputTokens: number;
  reasoningOutputTokens: number;
  durationMs: number;
  providerResponseId?: string;
  errorCode?: string;
  finishedAt: Date;
};

export type AiUsageTotals = {
  requests: number;
  succeeded: number;
  failed: number;
  inProgress: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedInputTokens: number;
  reasoningOutputTokens: number;
};

export interface AiUsageRepository {
  consumeQuota(input: {
    ownerId: string;
    reservationId: string;
    windowStart: Date;
    resetsAt: Date;
    limit: number;
  }): Promise<AiQuotaReservation>;
  releaseQuota(ownerId: string, windowStart: Date): Promise<void>;
  getQuotaUsed(ownerId: string, windowStart: Date): Promise<number>;
  createAttempt(input: CreateAiUsageAttemptInput): Promise<void>;
  completeAttempt(requestId: string, input: CompleteAiUsageAttemptInput): Promise<void>;
  summarize(ownerId: string, since: Date, projectId?: string): Promise<AiUsageTotals>;
}

export class MongoAiUsageRepository implements AiUsageRepository {
  async consumeQuota(input: {
    ownerId: string;
    reservationId: string;
    windowStart: Date;
    resetsAt: Date;
    limit: number;
  }): Promise<AiQuotaReservation> {
    let bucket: QuotaBucketSnapshot | null;
    try {
      bucket = await reserveQuotaBucket(input, true);
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      // Another request created this account/hour bucket first. Re-run the
      // atomic increment against that document rather than failing the request.
      bucket = await reserveQuotaBucket(input, false);
    }

    if (!bucket) throw new Error('Failed to reserve AI generation quota.');
    return {
      accepted: bucket.lastReservationId === input.reservationId,
      used: Math.min(bucket.count, input.limit),
    };
  }

  async releaseQuota(ownerId: string, windowStart: Date): Promise<void> {
    await AiQuotaBucketModel.updateOne(
      { ownerId, windowStart, count: { $gt: 0 } },
      { $inc: { count: -1 } },
    ).exec();
  }

  async getQuotaUsed(ownerId: string, windowStart: Date): Promise<number> {
    const bucket = await AiQuotaBucketModel.findOne({ ownerId, windowStart }).lean().exec();
    return bucket?.count ?? 0;
  }

  async createAttempt(input: CreateAiUsageAttemptInput): Promise<void> {
    await AiUsageRecordModel.create({
      requestId: input.requestId,
      ownerId: input.ownerId,
      projectId: input.projectId,
      scope: input.scope,
      provider: input.provider,
      modelName: input.model,
      status: 'started',
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cachedInputTokens: 0,
      reasoningOutputTokens: 0,
    });
  }

  async completeAttempt(
    requestId: string,
    input: CompleteAiUsageAttemptInput,
  ): Promise<void> {
    await AiUsageRecordModel.updateOne(
      { requestId },
      { $set: input },
    ).exec();
  }

  async summarize(ownerId: string, since: Date, projectId?: string): Promise<AiUsageTotals> {
    const match: Record<string, unknown> = { ownerId, createdAt: { $gte: since } };
    if (projectId) match.projectId = projectId;

    const [totals] = await AiUsageRecordModel.aggregate<AiUsageTotals>([
      { $match: match },
      {
        $group: {
          _id: null,
          requests: { $sum: 1 },
          succeeded: { $sum: { $cond: [{ $eq: ['$status', 'succeeded'] }, 1, 0] } },
          failed: {
            $sum: {
              $cond: [{ $in: ['$status', ['provider_error', 'invalid_output']] }, 1, 0],
            },
          },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'started'] }, 1, 0] } },
          inputTokens: { $sum: '$inputTokens' },
          outputTokens: { $sum: '$outputTokens' },
          totalTokens: { $sum: '$totalTokens' },
          cachedInputTokens: { $sum: '$cachedInputTokens' },
          reasoningOutputTokens: { $sum: '$reasoningOutputTokens' },
        },
      },
      { $project: { _id: 0 } },
    ]).exec();

    return totals ?? emptyAiUsageTotals();
  }
}

type QuotaBucketSnapshot = {
  count: number;
  lastReservationId: string;
};

async function reserveQuotaBucket(
  input: {
    ownerId: string;
    reservationId: string;
    windowStart: Date;
    resetsAt: Date;
    limit: number;
  },
  upsert: boolean,
): Promise<QuotaBucketSnapshot | null> {
  const currentCount = { $ifNull: ['$count', 0] };
  const canConsume = { $lt: [currentCount, input.limit] };
  const bucket = await AiQuotaBucketModel.findOneAndUpdate(
    { ownerId: input.ownerId, windowStart: input.windowStart },
    [{
      $set: {
        ownerId: input.ownerId,
        windowStart: input.windowStart,
        count: {
          $cond: [canConsume, { $add: [currentCount, 1] }, currentCount],
        },
        lastReservationId: {
          $cond: [canConsume, input.reservationId, '$lastReservationId'],
        },
        expiresAt: new Date(input.resetsAt.getTime() + QUOTA_BUCKET_RETENTION_MS),
      },
    }],
    { upsert, new: true },
  ).lean().exec();
  if (!bucket) return null;
  return {
    count: bucket.count,
    lastReservationId: bucket.lastReservationId,
  };
}

function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(
    error
    && typeof error === 'object'
    && (error as Record<string, unknown>).code === 11000,
  );
}

export function emptyAiUsageTotals(): AiUsageTotals {
  return {
    requests: 0,
    succeeded: 0,
    failed: 0,
    inProgress: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    cachedInputTokens: 0,
    reasoningOutputTokens: 0,
  };
}
