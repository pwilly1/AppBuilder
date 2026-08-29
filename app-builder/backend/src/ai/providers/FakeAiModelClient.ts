import type { AppGenerationPlanV1 } from '@apptura/shared/ai';
import type {
  AiModelClient,
  AiModelRequest,
  AiModelResult,
} from '../AiModelClient.js';

export type FakeAiPlanFactory = (request: AiModelRequest) => unknown | Promise<unknown>;

export class FakeAiModelClient implements AiModelClient {
  readonly providerName = 'fake';
  readonly modelName = 'deterministic-fixture';

  constructor(private readonly createPlan: FakeAiPlanFactory = createDefaultFakePlan) {}

  async generatePlan(request: AiModelRequest): Promise<AiModelResult> {
    return { plan: await this.createPlan(request) };
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
      visualStyle: {
        pageBackground: '#f8fafc',
        surfaceColor: '#ffffff',
        primaryColor: '#2563eb',
        primaryTextColor: '#ffffff',
        textColor: '#0f172a',
        mutedTextColor: '#475569',
        borderColor: '#cbd5e1',
        cornerStyle: 'soft',
        density: 'comfortable',
      },
      sections: [{
        key: 'generated-intro',
        pattern: 'intro',
        blockKeys: ['generated-title', 'generated-description'],
      }],
      blocks: [
        {
          key: 'generated-title',
          type: 'hero',
          visualRole: 'heading',
          content: { headline: 'Generated Page' },
          grid: { colStart: 2, rowStart: 2, colSpan: 14, rowSpan: 3 },
        },
        {
          key: 'generated-description',
          type: 'text',
          visualRole: 'body',
          content: { value: promptPreview },
          grid: { colStart: 2, rowStart: 6, colSpan: 14, rowSpan: 4 },
        },
      ],
    }],
  };
}
