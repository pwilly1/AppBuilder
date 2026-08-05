import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import type { AppGenerationPlanV1 } from '@apptura/shared/ai';
import express, { type RequestHandler } from 'express';
import type { AiModelRequest } from '../src/ai/AiModelClient.js';
import { AiGenerationRateLimitError } from '../src/ai/AiGenerationErrors.js';
import { AiGenerationService } from '../src/ai/AiGenerationService.js';
import type {
  AiUsageAttempt,
  AiUsageCompletion,
  AiUsageSummary,
  AiUsageTracker,
} from '../src/ai/AiUsageService.js';
import { FakeAiModelClient } from '../src/ai/providers/FakeAiModelClient.js';
import { AiGenerationController } from '../src/controllers/AiGenerationController.js';
import type { AuthenticatedRequest } from '../src/controllers/controllerUtils.js';
import type { ProjectRecord } from '../src/repositories/ProjectRepository.js';
import { makeAiGenerationRoutes } from '../src/routes/AiGenerationRoutes.js';

const PROJECT: ProjectRecord = {
  id: 'project-1',
  ownerId: 'owner-1',
  name: 'Crew Operations',
  schemaVersion: 8,
  pages: [{
    id: 'page-1',
    title: 'Home',
    path: '/',
    access: { mode: 'public' },
    blocks: [{
      id: 'hero-1',
      type: 'hero',
      props: { headline: 'Private block content must not enter model context' },
    }],
  }],
  dataCollections: [{
    id: 'collection-1',
    name: 'Crew Members',
    publicRead: true,
    access: { create: 'authenticated', read: 'public', update: 'own', delete: 'own' },
    fields: [{ id: 'field-1', key: 'name', label: 'Name', type: 'text', required: true }],
  }],
  updatedAt: new Date('2026-08-02T12:00:00.000Z'),
};

const VALID_PLAN: AppGenerationPlanV1 = {
  planVersion: 1,
  scope: 'page',
  summary: 'Add a generated operations page.',
  collections: [],
  pages: [{
    key: 'operations',
    title: 'Operations',
    path: '/operations',
    blocks: [{
      key: 'title',
      type: 'hero',
      content: { headline: 'Operations' },
      grid: { colStart: 2, rowStart: 2, colSpan: 14, rowSpan: 3 },
    }],
  }],
};

test('authenticated proposal route validates output without mutating the project', async () => {
  const before = JSON.stringify(PROJECT);
  let modelRequest: AiModelRequest | undefined;
  const model = new FakeAiModelClient((request) => {
    modelRequest = request;
    return VALID_PLAN;
  });
  const usage = new StubAiUsageTracker();
  const service = createService(model, usage);

  await withServer(createApp(service, allowOwner), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/projects/project-1/ai/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Create an operations page.', scope: 'page' }),
    });

    assert.equal(response.status, 200);
    const body = await response.json() as Record<string, unknown>;
    assert.equal(body.proposalId, 'proposal-1');
    assert.equal(body.planVersion, 1);
    assert.equal(body.capabilityCatalogVersion, 1);
    assert.equal(body.contextRevision, '2026-08-02T12:00:00.000Z');
    assert.deepEqual(body.plan, VALID_PLAN);
    assert.deepEqual(body.warnings, []);
    assert.deepEqual(body.generation, {
      provider: 'fake',
      model: 'deterministic-fixture',
      usage: ZERO_TOKEN_USAGE,
    });
    assert.deepEqual(body.quota, usage.quota);
  });

  assert.equal(JSON.stringify(PROJECT), before);
  assert.ok(modelRequest);
  assert.equal(modelRequest.prompt, 'Create an operations page.');
  assert.match(modelRequest.safetyIdentifier ?? '', /^[a-f0-9]{64}$/);
  assert.equal(modelRequest.safetyIdentifier?.includes(PROJECT.ownerId), false);
  assert.equal(modelRequest.context.project.pages[0]?.blockTypes[0], 'hero');
  assert.equal(modelRequest.context.project.collections[0]?.fields[0]?.key, 'name');
  const contextJson = JSON.stringify(modelRequest.context);
  assert.equal(contextJson.includes('owner-1'), false);
  assert.equal(contextJson.includes('Private block content'), false);
  assert.equal(usage.completions[0]?.status, 'succeeded');
});

test('correction route sends compiler diagnostics and preserves plan semantics', async () => {
  let modelRequest: AiModelRequest | undefined;
  const correctedPlan = structuredClone(VALID_PLAN);
  correctedPlan.pages[0]!.title = 'Changed by provider';
  const correctedHero = correctedPlan.pages[0]!.blocks[0]!;
  if (correctedHero.type !== 'hero') throw new Error('Expected hero fixture');
  correctedHero.content.headline = 'Changed by provider';
  correctedHero.content.headlineSize = 22;
  correctedHero.grid = { colStart: 1, rowStart: 1, colSpan: 16, rowSpan: 3 };

  const model = new FakeAiModelClient((request) => {
    modelRequest = request;
    return correctedPlan;
  });
  const service = createService(model);

  await withServer(createApp(service, allowOwner), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/projects/project-1/ai/proposals/corrections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Create an operations page.',
        scope: 'page',
        correctionAttempt: 1,
        previousPlan: VALID_PLAN,
        issues: [{
          code: 'layout-full',
          path: 'pages.operations.blocks.title.grid',
          message: 'No collision-free grid placement is available for this block.',
          details: {
            pageKey: 'operations',
            blockKey: 'title',
            proposedGrid: { colStart: 2, rowStart: 2, colSpan: 14, rowSpan: 3 },
            requiredSpan: { cols: 6, rows: 2 },
            availableSpan: { cols: 16, rows: 29 },
            siblingBlockKeys: [],
          },
        }],
      }),
    });

    assert.equal(response.status, 200);
    const body = await response.json() as { correctionAttempt: number; plan: AppGenerationPlanV1 };
    assert.equal(body.correctionAttempt, 1);
    assert.equal(body.plan.pages[0]?.title, VALID_PLAN.pages[0]?.title);
    const block = body.plan.pages[0]?.blocks[0];
    assert.equal(block?.type, 'hero');
    if (block?.type !== 'hero') throw new Error('Expected corrected hero');
    assert.equal(block.content.headline, 'Operations');
    assert.equal(block.content.headlineSize, 22);
    assert.deepEqual(block.grid, { colStart: 1, rowStart: 1, colSpan: 16, rowSpan: 3 });
  });

  assert.ok(modelRequest?.correction);
  assert.equal(modelRequest.correction.attempt, 1);
  assert.deepEqual(modelRequest.correction.previousPlan, VALID_PLAN);
  assert.equal(modelRequest.correction.issues[0]?.details?.blockKey, 'title');
});

test('correction route can remove a redirect that the compiler reported as unknown', async () => {
  const previousPlan = structuredClone(VALID_PLAN);
  previousPlan.pages[0]!.key = 'car-maintenance';
  previousPlan.pages[0]!.access = { mode: 'signedIn', redirectPageKey: 'home' };
  const correctedPlan = structuredClone(previousPlan);
  correctedPlan.pages[0]!.access = { mode: 'public', redirectPageKey: 'home' };
  const service = createService(new FakeAiModelClient(() => correctedPlan));

  await withServer(createApp(service, allowOwner), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/projects/project-1/ai/proposals/corrections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Create a car maintenance page.',
        scope: 'page',
        correctionAttempt: 1,
        previousPlan,
        issues: [{
          code: 'missing-reference',
          path: 'pages.car-maintenance.access.redirectPageKey',
          message: 'Unknown redirect page key "home".',
        }],
      }),
    });

    assert.equal(response.status, 200);
    const body = await response.json() as { plan: AppGenerationPlanV1 };
    assert.deepEqual(body.plan.pages[0]?.access, { mode: 'signedIn' });
  });
});

test('correction route rejects attempts outside the bounded retry window', async () => {
  let calls = 0;
  const service = createService(new FakeAiModelClient(() => {
    calls += 1;
    return VALID_PLAN;
  }));

  await withServer(createApp(service, allowOwner), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/projects/project-1/ai/proposals/corrections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Create an operations page.',
        scope: 'page',
        correctionAttempt: 3,
        previousPlan: VALID_PLAN,
        issues: [{ code: 'layout-full', path: '$.pages', message: 'Layout is full.' }],
      }),
    });
    assert.equal(response.status, 400);
    assert.match((await response.json() as { error: string }).error, /correctionAttempt/);
  });

  assert.equal(calls, 0);
});

test('correction route rejects provider attempts to add or remove blocks', async () => {
  const unsafePlan = structuredClone(VALID_PLAN);
  unsafePlan.pages[0]!.blocks.push({
    key: 'unexpected-block',
    type: 'text',
    content: { value: 'Unexpected' },
    grid: { colStart: 1, rowStart: 8, colSpan: 8, rowSpan: 2 },
  });
  const service = createService(new FakeAiModelClient(() => unsafePlan));

  await withServer(createApp(service, allowOwner), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/projects/project-1/ai/proposals/corrections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Create an operations page.',
        scope: 'page',
        correctionAttempt: 1,
        previousPlan: VALID_PLAN,
        issues: [{ code: 'layout-full', path: '$.pages', message: 'Layout is full.' }],
      }),
    });
    assert.equal(response.status, 422);
    const body = await response.json() as { error: string; issues: Array<{ code: string }> };
    assert.equal(body.error, 'The AI provider returned an unsafe layout correction.');
    assert.equal(body.issues[0]?.code, 'correction-structure-mismatch');
  });
});

test('default fake provider returns a contract-valid deterministic page', async () => {
  const service = createService(new FakeAiModelClient());

  await withServer(createApp(service, allowOwner), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/projects/project-1/ai/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Create a scheduling page.' }),
    });
    assert.equal(response.status, 200);
    const body = await response.json() as { plan: AppGenerationPlanV1 };
    assert.equal(body.plan.scope, 'page');
    assert.equal(body.plan.pages[0]?.blocks[0]?.type, 'hero');
    assert.equal(body.plan.pages[0]?.blocks[1]?.type, 'text');
  });
});

test('proposal route requires builder authentication before calling the provider', async () => {
  let calls = 0;
  const service = createService(new FakeAiModelClient(() => {
    calls += 1;
    return VALID_PLAN;
  }));
  const denyAuth: RequestHandler = (_req, res) => {
    res.status(401).json({ error: 'Missing Authorization token' });
  };

  await withServer(createApp(service, denyAuth), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/projects/project-1/ai/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Create a page.' }),
    });
    assert.equal(response.status, 401);
  });

  assert.equal(calls, 0);
});

test('proposal route rejects projects the builder does not own', async () => {
  let calls = 0;
  const service = new AiGenerationService(
    { findOwned: async () => null },
    new FakeAiModelClient(() => {
      calls += 1;
      return VALID_PLAN;
    }),
    new StubAiUsageTracker(),
    () => 'proposal-1',
  );

  await withServer(createApp(service, allowOwner), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/projects/project-2/ai/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Create a page.' }),
    });
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'Project not found' });
  });

  assert.equal(calls, 0);
});

test('proposal route returns structured validation issues for invalid provider output', async () => {
  const usage = new StubAiUsageTracker();
  const service = createService(
    new FakeAiModelClient(() => ({ planVersion: 1 })),
    usage,
  );

  await withServer(createApp(service, allowOwner), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/projects/project-1/ai/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Create a page.' }),
    });
    assert.equal(response.status, 422);
    const body = await response.json() as { error: string; issues: unknown[] };
    assert.equal(body.error, 'The AI provider returned an invalid generation plan.');
    assert.ok(body.issues.length > 0);
  });
  assert.equal(usage.completions[0]?.status, 'invalid_output');
});

test('proposal route hides provider failure details', async () => {
  const usage = new StubAiUsageTracker();
  const service = createService(new FakeAiModelClient(() => {
    throw new Error('private-provider-key-and-upstream-details');
  }), usage);

  await withServer(createApp(service, allowOwner), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/projects/project-1/ai/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Create a page.' }),
    });
    assert.equal(response.status, 502);
    const body = await response.json() as { error: string };
    assert.equal(body.error, 'The AI provider could not generate a proposal.');
    assert.equal(JSON.stringify(body).includes('private-provider-key'), false);
  });
  assert.equal(usage.completions[0]?.status, 'provider_error');
});

test('proposal route validates bounded request input before calling the provider', async () => {
  let calls = 0;
  const service = createService(new FakeAiModelClient(() => {
    calls += 1;
    return VALID_PLAN;
  }));

  await withServer(createApp(service, allowOwner), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/projects/project-1/ai/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Create a page.', unexpected: true }),
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'Unsupported request property "unexpected".' });
  });

  assert.equal(calls, 0);
});

test('proposal route returns a controlled account quota response before calling the provider', async () => {
  let calls = 0;
  const quota = {
    limit: 20,
    used: 20,
    remaining: 0,
    resetsAt: new Date(Date.now() + 60_000).toISOString(),
  };
  const usage = new StubAiUsageTracker(new AiGenerationRateLimitError(quota));
  const service = createService(new FakeAiModelClient(() => {
    calls += 1;
    return VALID_PLAN;
  }), usage);

  await withServer(createApp(service, allowOwner), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/projects/project-1/ai/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Create a page.' }),
    });
    assert.equal(response.status, 429);
    assert.ok(response.headers.get('retry-after'));
    assert.deepEqual(await response.json(), {
      error: 'AI generation limit reached. Try again after the quota resets.',
      quota,
    });
  });

  assert.equal(calls, 0);
});

test('usage route returns account and project totals for an owned project', async () => {
  const usage = new StubAiUsageTracker();
  const service = createService(new FakeAiModelClient(), usage);

  await withServer(createApp(service, allowOwner), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/projects/project-1/ai/usage`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), usage.summary);
  });
});

const allowOwner: RequestHandler = (req, _res, next) => {
  (req as AuthenticatedRequest).userId = 'owner-1';
  next();
};

function createService(
  model: FakeAiModelClient,
  usage: AiUsageTracker = new StubAiUsageTracker(),
) {
  return new AiGenerationService(
    {
      findOwned: async (projectId: string, ownerId: string) => (
        projectId === PROJECT.id && ownerId === PROJECT.ownerId ? PROJECT : null
      ),
    },
    model,
    usage,
    () => 'proposal-1',
  );
}

const ZERO_TOKEN_USAGE = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  cachedInputTokens: 0,
  reasoningOutputTokens: 0,
};

class StubAiUsageTracker implements AiUsageTracker {
  readonly quota = {
    limit: 20,
    used: 1,
    remaining: 19,
    resetsAt: '2026-08-04T13:00:00.000Z',
  };
  readonly summary: AiUsageSummary = {
    quota: this.quota,
    periodStart: '2026-07-05T12:00:00.000Z',
    account: {
      requests: 2,
      succeeded: 1,
      failed: 1,
      inProgress: 0,
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      cachedInputTokens: 10,
      reasoningOutputTokens: 20,
    },
    project: {
      requests: 1,
      succeeded: 1,
      failed: 0,
      inProgress: 0,
      inputTokens: 60,
      outputTokens: 30,
      totalTokens: 90,
      cachedInputTokens: 0,
      reasoningOutputTokens: 10,
    },
  };
  readonly completions: AiUsageCompletion[] = [];

  constructor(private readonly beginError?: Error) {}

  async beginAttempt(): Promise<AiUsageAttempt> {
    if (this.beginError) throw this.beginError;
    return {
      requestId: 'usage-request-1',
      startedAt: new Date('2026-08-04T12:00:00.000Z'),
      quota: this.quota,
    };
  }

  async finishAttempt(_attempt: AiUsageAttempt, completion: AiUsageCompletion): Promise<void> {
    this.completions.push(completion);
  }

  async getSummary(): Promise<AiUsageSummary> {
    return this.summary;
  }
}

function createApp(service: AiGenerationService, requireAuth: RequestHandler) {
  const app = express();
  app.use(express.json());
  app.use('/projects', makeAiGenerationRoutes(new AiGenerationController(service), requireAuth));
  app.use((_error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ error: 'Internal server error' });
  });
  return app;
}

async function withServer(app: express.Express, run: (baseUrl: string) => Promise<void>) {
  const server = app.listen(0);
  await waitForListening(server);
  const { port } = server.address() as AddressInfo;
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await closeServer(server);
  }
}

function waitForListening(server: Server) {
  if (server.listening) return Promise.resolve();
  return new Promise<void>((resolve) => server.once('listening', resolve));
}

function closeServer(server: Server) {
  return new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}
