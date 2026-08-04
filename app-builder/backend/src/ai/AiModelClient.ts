import type { AiGenerationScope } from '@apptura/shared/ai';
import type { AiGenerationContext } from './AiContextBuilder.js';

export type AiModelRequest = {
  prompt: string;
  scope: AiGenerationScope;
  context: AiGenerationContext;
  safetyIdentifier?: string;
};

export type AiModelTokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedInputTokens: number;
  reasoningOutputTokens: number;
};

export type AiModelResult = {
  plan: unknown;
  usage?: AiModelTokenUsage;
  responseId?: string;
};

export class AiModelClientError extends Error {
  readonly usage: AiModelTokenUsage | undefined;
  readonly responseId: string | undefined;
  readonly code: string | undefined;

  constructor(
    message: string,
    metadata: {
      usage?: AiModelTokenUsage;
      responseId?: string;
      code?: string;
      cause?: unknown;
    } = {},
  ) {
    super(message, metadata.cause === undefined ? undefined : { cause: metadata.cause });
    this.usage = metadata.usage;
    this.responseId = metadata.responseId;
    this.code = metadata.code;
  }
}

export interface AiModelClient {
  readonly providerName: string;
  readonly modelName: string;
  generatePlan(request: AiModelRequest): Promise<AiModelResult>;
}
