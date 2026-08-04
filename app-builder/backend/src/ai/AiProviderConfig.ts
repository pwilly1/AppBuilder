export const DEFAULT_OPENAI_MODEL = 'gpt-5.6-terra';
export const DEFAULT_AI_REQUEST_TIMEOUT_MS = 60_000;

const MIN_AI_REQUEST_TIMEOUT_MS = 1_000;
const MAX_AI_REQUEST_TIMEOUT_MS = 300_000;

export type FakeAiProviderConfig = {
  provider: 'fake';
};

export type OpenAiProviderConfig = {
  provider: 'openai';
  apiKey: string;
  model: string;
  timeoutMs: number;
};

export type AiProviderConfig = FakeAiProviderConfig | OpenAiProviderConfig;

export function readAiProviderConfig(
  env: Record<string, string | undefined> = process.env,
): AiProviderConfig {
  const provider = env.AI_PROVIDER?.trim().toLowerCase() || 'fake';
  if (provider === 'fake') return { provider };
  if (provider !== 'openai') {
    throw new Error('AI_PROVIDER must be either "fake" or "openai".');
  }

  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required when AI_PROVIDER is "openai".');
  }

  const model = env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
  const timeoutMs = parseTimeout(env.AI_REQUEST_TIMEOUT_MS);
  return { provider, apiKey, model, timeoutMs };
}

function parseTimeout(value: string | undefined): number {
  if (!value?.trim()) return DEFAULT_AI_REQUEST_TIMEOUT_MS;
  const timeoutMs = Number(value);
  if (
    !Number.isInteger(timeoutMs)
    || timeoutMs < MIN_AI_REQUEST_TIMEOUT_MS
    || timeoutMs > MAX_AI_REQUEST_TIMEOUT_MS
  ) {
    throw new Error(
      `AI_REQUEST_TIMEOUT_MS must be an integer from ${MIN_AI_REQUEST_TIMEOUT_MS} to ${MAX_AI_REQUEST_TIMEOUT_MS}.`,
    );
  }
  return timeoutMs;
}
