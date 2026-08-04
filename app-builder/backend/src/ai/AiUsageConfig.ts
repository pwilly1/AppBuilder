export const DEFAULT_AI_GENERATION_REQUESTS_PER_HOUR = 20;
export const DEFAULT_AI_USAGE_SUMMARY_DAYS = 30;

const MAX_AI_GENERATION_REQUESTS_PER_HOUR = 1_000;
const MAX_AI_USAGE_SUMMARY_DAYS = 365;

export type AiUsageConfig = {
  requestsPerHour: number;
  summaryDays: number;
};

export function readAiUsageConfig(
  env: Record<string, string | undefined> = process.env,
): AiUsageConfig {
  return {
    requestsPerHour: parseInteger(
      env.AI_GENERATION_REQUESTS_PER_HOUR,
      'AI_GENERATION_REQUESTS_PER_HOUR',
      DEFAULT_AI_GENERATION_REQUESTS_PER_HOUR,
      1,
      MAX_AI_GENERATION_REQUESTS_PER_HOUR,
    ),
    summaryDays: parseInteger(
      env.AI_USAGE_SUMMARY_DAYS,
      'AI_USAGE_SUMMARY_DAYS',
      DEFAULT_AI_USAGE_SUMMARY_DAYS,
      1,
      MAX_AI_USAGE_SUMMARY_DAYS,
    ),
  };
}

function parseInteger(
  value: string | undefined,
  name: string,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be an integer from ${min} to ${max}.`);
  }
  return parsed;
}
