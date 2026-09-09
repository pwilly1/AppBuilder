import type { AiBlockPlan, AiPagePlan } from '@apptura/shared/ai'
import type { Page } from '../shared/schema/types'

// Copy only presentation values supported by the AI contract; keep semantic keys and behavior.
const PRESENTATION_KEYS: Record<AiBlockPlan['type'], readonly string[]> = {
  hero: ['fontFamily', 'headlineSize', 'contentPadding'],
  text: ['fontFamily', 'fontSize', 'contentPadding', 'textColor', 'backgroundColor', 'placeholderColor',
    'borderColor', 'borderWidth', 'borderRadius'],
  button: ['fontFamily', 'fontSize', 'buttonPaddingX', 'buttonPaddingY', 'backgroundColor', 'textColor', 'borderRadius'],
  repeater: ['itemRowSpan', 'gapRows', 'backgroundColor', 'borderColor', 'borderWidth', 'borderRadius', 'opacity'],
}

export function createRenderedReviewPage(
  plan: AiPagePlan,
  rendered: Page,
  blockKeyById: ReadonlyMap<string, string>,
): AiPagePlan {
  const renderedByKey = new Map(rendered.blocks.map((block) => [blockKeyById.get(block.id), block]))
  return {
    ...plan,
    blocks: plan.blocks.map((block) => {
      const actual = renderedByKey.get(block.key)
      if (!actual?.layout?.grid) return block
      const presentation = Object.fromEntries(PRESENTATION_KEYS[block.type].flatMap((key) => {
        const value = actual.props[key]
        return value === undefined ? [] : [[key, value]]
      }))
      return withPresentation(block, {
        grid: { ...actual.layout.grid },
        render: {
          ...(actual.render?.alignX ? { alignX: actual.render.alignX } : {}),
          ...(actual.render?.alignY ? { alignY: actual.render.alignY } : {}),
        },
      }, presentation)
    }),
  }
}

function withPresentation<T extends AiBlockPlan>(
  block: T,
  layout: Pick<AiBlockPlan, 'grid' | 'render'>,
  presentation: Record<string, unknown>,
): T {
  return { ...block, ...layout, content: { ...block.content, ...presentation } }
}
