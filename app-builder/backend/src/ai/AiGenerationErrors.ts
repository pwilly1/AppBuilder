import type { AiGenerationPlanIssue } from '@apptura/shared/ai';

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
