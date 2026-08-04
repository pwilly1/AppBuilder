import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_AI_GENERATION_REQUESTS_PER_HOUR,
  DEFAULT_AI_USAGE_SUMMARY_DAYS,
  readAiUsageConfig,
} from '../src/ai/AiUsageConfig.js';

test('AI usage configuration uses bounded production defaults', () => {
  assert.deepEqual(readAiUsageConfig({}), {
    requestsPerHour: DEFAULT_AI_GENERATION_REQUESTS_PER_HOUR,
    summaryDays: DEFAULT_AI_USAGE_SUMMARY_DAYS,
  });
});

test('AI usage configuration accepts explicit request and reporting limits', () => {
  assert.deepEqual(readAiUsageConfig({
    AI_GENERATION_REQUESTS_PER_HOUR: '12',
    AI_USAGE_SUMMARY_DAYS: '90',
  }), {
    requestsPerHour: 12,
    summaryDays: 90,
  });
});

test('AI usage configuration rejects unsafe values', () => {
  assert.throws(
    () => readAiUsageConfig({ AI_GENERATION_REQUESTS_PER_HOUR: '0' }),
    /AI_GENERATION_REQUESTS_PER_HOUR/,
  );
  assert.throws(
    () => readAiUsageConfig({ AI_USAGE_SUMMARY_DAYS: 'forever' }),
    /AI_USAGE_SUMMARY_DAYS/,
  );
});
