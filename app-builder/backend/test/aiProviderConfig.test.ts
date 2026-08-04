import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_AI_REQUEST_TIMEOUT_MS,
  DEFAULT_OPENAI_MODEL,
  readAiProviderConfig,
} from '../src/ai/AiProviderConfig.js';
import { createAiModelClient } from '../src/ai/createAiModelClient.js';
import { FakeAiModelClient } from '../src/ai/providers/FakeAiModelClient.js';

test('AI provider configuration defaults to the deterministic fake provider', () => {
  assert.deepEqual(readAiProviderConfig({}), { provider: 'fake' });
  assert.ok(createAiModelClient({ provider: 'fake' }) instanceof FakeAiModelClient);
});

test('OpenAI provider configuration reads backend-only settings and safe defaults', () => {
  assert.deepEqual(
    readAiProviderConfig({
      AI_PROVIDER: ' openai ',
      OPENAI_API_KEY: ' service-account-key ',
    }),
    {
      provider: 'openai',
      apiKey: 'service-account-key',
      model: DEFAULT_OPENAI_MODEL,
      timeoutMs: DEFAULT_AI_REQUEST_TIMEOUT_MS,
    },
  );

  assert.deepEqual(
    readAiProviderConfig({
      AI_PROVIDER: 'openai',
      OPENAI_API_KEY: 'key',
      OPENAI_MODEL: 'gpt-test-model',
      AI_REQUEST_TIMEOUT_MS: '90000',
    }),
    {
      provider: 'openai',
      apiKey: 'key',
      model: 'gpt-test-model',
      timeoutMs: 90_000,
    },
  );
});

test('OpenAI provider configuration rejects missing secrets and unsafe settings', () => {
  assert.throws(
    () => readAiProviderConfig({ AI_PROVIDER: 'openai' }),
    /OPENAI_API_KEY is required/,
  );
  assert.throws(
    () => readAiProviderConfig({ AI_PROVIDER: 'unknown' }),
    /AI_PROVIDER must be either/,
  );
  assert.throws(
    () => readAiProviderConfig({
      AI_PROVIDER: 'openai',
      OPENAI_API_KEY: 'key',
      AI_REQUEST_TIMEOUT_MS: 'not-a-number',
    }),
    /AI_REQUEST_TIMEOUT_MS must be an integer/,
  );
});
