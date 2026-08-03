import type { AppGenerationPlanV1 } from '@apptura/shared/ai';
import type { AiModelClient, AiModelRequest } from '../AiModelClient.js';

export type FakeAiPlanFactory = (request: AiModelRequest) => unknown | Promise<unknown>;

export class FakeAiModelClient implements AiModelClient {
  constructor(private readonly createPlan: FakeAiPlanFactory = createDefaultFakePlan) {}

  async generatePlan(request: AiModelRequest): Promise<unknown> {
    return this.createPlan(request);
  }
}

function createDefaultFakePlan(request: AiModelRequest): AppGenerationPlanV1 {
  const promptPreview = request.prompt.replace(/\s+/g, ' ').trim().slice(0, 180);
  return {
    planVersion: 1,
    scope: request.scope,
    summary: `Generated a deterministic page draft for: ${promptPreview}`.slice(0, 240),
    collections: [],
    pages: [{
      key: 'generated-page',
      title: 'Generated Page',
      path: '/generated',
      blocks: [
        {
          key: 'generated-title',
          type: 'hero',
          content: { headline: 'Generated Page' },
          grid: { colStart: 2, rowStart: 2, colSpan: 14, rowSpan: 3 },
        },
        {
          key: 'generated-description',
          type: 'text',
          content: { value: promptPreview },
          grid: { colStart: 2, rowStart: 6, colSpan: 14, rowSpan: 4 },
        },
      ],
    }],
  };
}
