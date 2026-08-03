import type { AiGenerationScope } from '@apptura/shared/ai';
import type { AiGenerationContext } from './AiContextBuilder.js';

export type AiModelRequest = {
  prompt: string;
  scope: AiGenerationScope;
  context: AiGenerationContext;
};

export interface AiModelClient {
  generatePlan(request: AiModelRequest): Promise<unknown>;
}
