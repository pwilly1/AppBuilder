import {
  AI_GENERATION_CORRECTION_LIMITS,
  AI_GENERATION_MAX_CORRECTIONS,
  AI_GENERATION_SUPPORTED_SCOPES,
  parseAppGenerationPlan,
  type AiGenerationPlanIssue,
  type AiGenerationScope,
  type AppGenerationPlanV1,
} from '@apptura/shared/ai';
import { AiGenerationRequestError } from './AiGenerationErrors.js';

const AI_PROMPT_MAX_LENGTH = 2_000;
export const AI_GENERATION_PLAN_MAX_BYTES = 256 * 1024;

export type AiGenerationRequest = {
  prompt: string;
  scope: AiGenerationScope;
};

export type AiGenerationCorrectionRequest = AiGenerationRequest & {
  correctionAttempt: number;
  previousPlan: AppGenerationPlanV1;
  issues: AiGenerationPlanIssue[];
};

export function parseGenerationRequest(input: unknown): AiGenerationRequest {
  const body = readRequestBody(input, ['prompt', 'scope']);
  return parsePromptAndScope(body);
}

export function parseCorrectionRequest(input: unknown): AiGenerationCorrectionRequest {
  const body = readRequestBody(input, [
    'prompt',
    'scope',
    'correctionAttempt',
    'previousPlan',
    'issues',
  ]);
  const base = parsePromptAndScope(body);
  if (
    typeof body.correctionAttempt !== 'number'
    || !Number.isInteger(body.correctionAttempt)
    || body.correctionAttempt < 1
    || body.correctionAttempt > AI_GENERATION_MAX_CORRECTIONS
  ) {
    throw new AiGenerationRequestError(
      `correctionAttempt must be an integer from 1 to ${AI_GENERATION_MAX_CORRECTIONS}.`,
    );
  }

  assertRequestValueSize(body.previousPlan, 'previousPlan');
  const previousPlan = parseAppGenerationPlan(body.previousPlan);
  if (!previousPlan.success || previousPlan.data.scope !== base.scope) {
    throw new AiGenerationRequestError('previousPlan must be a valid plan for the requested scope.');
  }

  return {
    ...base,
    correctionAttempt: body.correctionAttempt,
    previousPlan: previousPlan.data,
    issues: parseCorrectionIssues(body.issues),
  };
}

function readRequestBody(
  input: unknown,
  allowedKeys: readonly string[],
): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AiGenerationRequestError('A generation request body is required.');
  }
  const body = input as Record<string, unknown>;
  const allowed = new Set(allowedKeys);
  const unknownKey = Object.keys(body).find((key) => !allowed.has(key));
  if (unknownKey) {
    throw new AiGenerationRequestError(`Unsupported request property "${unknownKey}".`);
  }
  return body;
}

function parsePromptAndScope(body: Record<string, unknown>): AiGenerationRequest {
  if (typeof body.prompt !== 'string' || !body.prompt.trim()) {
    throw new AiGenerationRequestError('Prompt is required.');
  }
  const prompt = body.prompt.trim();
  if (prompt.length > AI_PROMPT_MAX_LENGTH) {
    throw new AiGenerationRequestError(`Prompt must be ${AI_PROMPT_MAX_LENGTH} characters or fewer.`);
  }

  const scopeValue = body.scope ?? 'page';
  if (
    typeof scopeValue !== 'string'
    || !AI_GENERATION_SUPPORTED_SCOPES.includes(scopeValue as AiGenerationScope)
  ) {
    throw new AiGenerationRequestError(
      `Scope must be one of: ${AI_GENERATION_SUPPORTED_SCOPES.join(', ')}.`,
    );
  }
  return { prompt, scope: scopeValue as AiGenerationScope };
}

function parseCorrectionIssues(value: unknown): AiGenerationPlanIssue[] {
  if (
    !Array.isArray(value)
    || value.length < 1
    || value.length > AI_GENERATION_CORRECTION_LIMITS.maxIssues
  ) {
    throw new AiGenerationRequestError(
      `issues must contain between 1 and ${AI_GENERATION_CORRECTION_LIMITS.maxIssues} compiler issues.`,
    );
  }

  return value.map((entry, index) => {
    const path = `issues[${index}]`;
    const issue = readExactObject(entry, path, ['code', 'path', 'message', 'details']);
    const details = issue.details === undefined
      ? undefined
      : parseCorrectionIssueDetails(issue.details, `${path}.details`);
    return {
      code: readBoundedString(issue.code, `${path}.code`, 80),
      path: readBoundedString(issue.path, `${path}.path`, 300),
      message: readBoundedString(issue.message, `${path}.message`, 500),
      ...(details ? { details } : {}),
    };
  });
}

function parseCorrectionIssueDetails(
  value: unknown,
  path: string,
): NonNullable<AiGenerationPlanIssue['details']> {
  const details = readExactObject(value, path, [
    'pageKey',
    'blockKey',
    'proposedGrid',
    'normalizedGrid',
    'requiredSpan',
    'availableSpan',
    'siblingBlockKeys',
  ]);

  return {
    ...(details.pageKey === undefined
      ? {}
      : { pageKey: readBoundedString(details.pageKey, `${path}.pageKey`, 80) }),
    ...(details.blockKey === undefined
      ? {}
      : { blockKey: readBoundedString(details.blockKey, `${path}.blockKey`, 80) }),
    ...(details.proposedGrid === undefined
      ? {}
      : { proposedGrid: parseIssueGrid(details.proposedGrid, `${path}.proposedGrid`) }),
    ...(details.normalizedGrid === undefined
      ? {}
      : { normalizedGrid: parseIssueGrid(details.normalizedGrid, `${path}.normalizedGrid`) }),
    ...(details.requiredSpan === undefined
      ? {}
      : { requiredSpan: parseIssueSpan(details.requiredSpan, `${path}.requiredSpan`) }),
    ...(details.availableSpan === undefined
      ? {}
      : { availableSpan: parseIssueSpan(details.availableSpan, `${path}.availableSpan`) }),
    ...(details.siblingBlockKeys === undefined
      ? {}
      : { siblingBlockKeys: parseRelatedBlockKeys(details.siblingBlockKeys, path) }),
  };
}

function parseIssueGrid(value: unknown, path: string) {
  const grid = readExactObject(value, path, ['colStart', 'rowStart', 'colSpan', 'rowSpan']);
  return {
    colStart: readBoundedInteger(grid.colStart, `${path}.colStart`, 1, 128),
    rowStart: readBoundedInteger(grid.rowStart, `${path}.rowStart`, 1, 128),
    colSpan: readBoundedInteger(grid.colSpan, `${path}.colSpan`, 1, 64),
    rowSpan: readBoundedInteger(grid.rowSpan, `${path}.rowSpan`, 1, 64),
  };
}

function parseIssueSpan(value: unknown, path: string) {
  const span = readExactObject(value, path, ['cols', 'rows']);
  return {
    cols: readBoundedInteger(span.cols, `${path}.cols`, 1, 128),
    rows: readBoundedInteger(span.rows, `${path}.rows`, 1, 128),
  };
}

function parseRelatedBlockKeys(value: unknown, path: string): string[] {
  if (
    !Array.isArray(value)
    || value.length > AI_GENERATION_CORRECTION_LIMITS.maxRelatedBlockKeys
  ) {
    throw new AiGenerationRequestError(
      `${path}.siblingBlockKeys must contain at most ${AI_GENERATION_CORRECTION_LIMITS.maxRelatedBlockKeys} entries.`,
    );
  }
  return value.map((entry, index) => (
    readBoundedString(entry, `${path}.siblingBlockKeys[${index}]`, 80)
  ));
}

function readExactObject(
  value: unknown,
  path: string,
  allowedKeys: readonly string[],
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AiGenerationRequestError(`${path} must be an object.`);
  }
  const object = value as Record<string, unknown>;
  const allowed = new Set(allowedKeys);
  const unknownKey = Object.keys(object).find((key) => !allowed.has(key));
  if (unknownKey) {
    throw new AiGenerationRequestError(`${path} contains unsupported property "${unknownKey}".`);
  }
  return object;
}

function readBoundedString(value: unknown, path: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new AiGenerationRequestError(`${path} must be a non-empty string of at most ${maxLength} characters.`);
  }
  return value.trim();
}

function readBoundedInteger(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum || value > maximum) {
    throw new AiGenerationRequestError(`${path} must be an integer from ${minimum} to ${maximum}.`);
  }
  return value;
}

function assertRequestValueSize(value: unknown, path: string): void {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new AiGenerationRequestError(`${path} must be JSON-compatible.`);
  }
  if (!serialized || Buffer.byteLength(serialized, 'utf8') > AI_GENERATION_PLAN_MAX_BYTES) {
    throw new AiGenerationRequestError(`${path} exceeds the allowed size.`);
  }
}
