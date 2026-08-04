import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AI_GENERATION_CAPABILITIES,
  parseAppGenerationPlan,
} from '@apptura/shared/ai';
import type { AiGenerationContext } from '../src/ai/AiContextBuilder.js';
import type { AiModelRequest } from '../src/ai/AiModelClient.js';
import {
  OpenAiModelClient,
  type OpenAiResponseCreator,
} from '../src/ai/providers/OpenAiModelClient.js';
import { OPENAI_APP_GENERATION_PLAN_SCHEMA } from '../src/ai/providers/OpenAiGenerationSchema.js';

const CONTEXT: AiGenerationContext = {
  project: {
    name: 'Crew Operations',
    schemaVersion: 8,
    pages: [{
      title: 'Home',
      path: '/',
      accessMode: 'public',
      blockTypes: ['hero'],
    }],
    collections: [],
  },
  capabilities: AI_GENERATION_CAPABILITIES,
};

const MODEL_REQUEST: AiModelRequest = {
  prompt: 'Create an operations page.',
  scope: 'page',
  context: CONTEXT,
  safetyIdentifier: 'a'.repeat(64),
};

test('OpenAI client requests strict structured output and returns parser-compatible data', async () => {
  let captured: Parameters<OpenAiResponseCreator>[0] | undefined;
  const providerPlan = {
    planVersion: 1,
    scope: 'page',
    summary: 'Create an operations page.',
    collections: [],
    pages: [{
      key: 'operations',
      title: 'Operations',
      path: null,
      backgroundColor: null,
      access: null,
      blocks: [{
        key: 'operations-title',
        parentKey: null,
        type: 'hero',
        grid: { colStart: 2, rowStart: 2, colSpan: 14, rowSpan: 3 },
        render: null,
        content: {
          headline: 'Operations',
          headlineSize: null,
          contentPadding: null,
        },
        headlineBinding: null,
      }],
    }],
  };
  const createResponse: OpenAiResponseCreator = async (params) => {
    captured = params;
    return {
      id: 'resp-test-1',
      output_text: JSON.stringify(providerPlan),
      status: 'completed',
      incomplete_details: null,
      output: [],
      usage: {
        input_tokens: 120,
        input_tokens_details: { cache_write_tokens: 0, cached_tokens: 20 },
        output_tokens: 80,
        output_tokens_details: { reasoning_tokens: 30 },
        total_tokens: 200,
      },
    };
  };
  const client = createClient(createResponse);

  const result = await client.generatePlan(MODEL_REQUEST);
  const parsed = parseAppGenerationPlan(result.plan);
  assert.equal(parsed.success, true);
  assert.equal(result.responseId, 'resp-test-1');
  assert.deepEqual(result.usage, {
    inputTokens: 120,
    outputTokens: 80,
    totalTokens: 200,
    cachedInputTokens: 20,
    reasoningOutputTokens: 30,
  });
  assert.ok(captured);
  assert.equal(captured.model, 'gpt-test-model');
  assert.equal(captured.store, false);
  assert.equal(captured.truncation, 'disabled');
  assert.equal(captured.safety_identifier, MODEL_REQUEST.safetyIdentifier);
  assert.deepEqual(captured.reasoning, { effort: 'medium' });

  const format = captured.text?.format as Record<string, unknown>;
  assert.equal(format.type, 'json_schema');
  assert.equal(format.strict, true);
  const input = JSON.parse(captured.input as string) as Record<string, unknown>;
  assert.equal(input.userRequest, MODEL_REQUEST.prompt);
  assert.deepEqual(input.allowedCapabilities, AI_GENERATION_CAPABILITIES);
  assert.equal(JSON.stringify(result.plan).includes('null'), false);
});

test('OpenAI client rejects refusals, incomplete responses, and malformed output', async () => {
  await assert.rejects(
    createClient(async () => ({
      output_text: '',
      status: 'completed',
      output: [{
        type: 'message',
        content: [{ type: 'refusal', refusal: 'Cannot comply.' }],
      }],
    })).generatePlan(MODEL_REQUEST),
    /refused the generation request/,
  );

  await assert.rejects(
    createClient(async () => ({
      output_text: '',
      status: 'incomplete',
      incomplete_details: { reason: 'max_output_tokens' },
    })).generatePlan(MODEL_REQUEST),
    /did not complete \(max_output_tokens\)/,
  );

  await assert.rejects(
    createClient(async () => ({
      output_text: 'not-json',
      status: 'completed',
    })).generatePlan(MODEL_REQUEST),
    /was not valid JSON/,
  );
});

test('OpenAI structured-output schema covers the shared capability catalog', () => {
  const serializedSchema = JSON.stringify(OPENAI_APP_GENERATION_PLAN_SCHEMA);
  for (const blockType of AI_GENERATION_CAPABILITIES.blockTypes) {
    assert.ok(
      serializedSchema.includes(`\"enum\":[\"${blockType}\"]`),
      `missing provider schema for block type ${blockType}`,
    );
  }
  for (const actionType of AI_GENERATION_CAPABILITIES.actionTypes) {
    assert.ok(
      serializedSchema.includes(`\"enum\":[\"${actionType}\"]`),
      `missing provider schema for action type ${actionType}`,
    );
  }
  assertStrictObjects(OPENAI_APP_GENERATION_PLAN_SCHEMA);
});

function createClient(createResponse: OpenAiResponseCreator): OpenAiModelClient {
  return new OpenAiModelClient({
    provider: 'openai',
    apiKey: 'test-key',
    model: 'gpt-test-model',
    timeoutMs: 1_000,
  }, createResponse);
}

function assertStrictObjects(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(assertStrictObjects);
    return;
  }
  if (!value || typeof value !== 'object') return;

  const object = value as Record<string, unknown>;
  if (object.type === 'object') {
    const properties = object.properties as Record<string, unknown>;
    assert.equal(object.additionalProperties, false);
    assert.deepEqual(
      [...(object.required as string[])].sort(),
      Object.keys(properties).sort(),
    );
  }
  Object.values(object).forEach(assertStrictObjects);
}
