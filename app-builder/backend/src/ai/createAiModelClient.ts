import type { AiProviderConfig } from './AiProviderConfig.js';
import type { AiModelClient } from './AiModelClient.js';
import { FakeAiModelClient } from './providers/FakeAiModelClient.js';
import { OpenAiModelClient } from './providers/OpenAiModelClient.js';

export function createAiModelClient(config: AiProviderConfig): AiModelClient {
  if (config.provider === 'openai') return new OpenAiModelClient(config);
  return new FakeAiModelClient();
}
