import type { AiGenerationPlanIssue } from '@apptura/shared/ai';
import type { AiQuotaSummary } from './AiUsageService.js';

export class AiGenerationRequestError extends Error {}

export class AiGenerationOutputError extends Error {
  constructor(
    message: string,
    readonly issues: AiGenerationPlanIssue[],
  ) {
    super(message);
  }
}

export class AiModelProviderError extends Error {
  constructor(cause?: unknown) {
    super('The AI provider could not generate a proposal.', { cause });
  }
}

export class AiGenerationRateLimitError extends Error {
  constructor(readonly quota: AiQuotaSummary) {
    super('AI generation limit reached. Try again after the quota resets.');
  }
}
