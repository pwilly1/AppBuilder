import type {
  AiBlockPlan,
  AiGenerationVisualRole,
  AiPagePlan,
} from '@apptura/shared/ai'

const DEFAULT_PAGE_BACKGROUND = '#ffffff'

export function resolveGeneratedPageBackground(page: AiPagePlan): string {
  return page.visualStyle?.pageBackground ?? page.backgroundColor ?? DEFAULT_PAGE_BACKGROUND
}

export function resolveGeneratedVisualRole(block: AiBlockPlan): AiGenerationVisualRole {
  if (block.visualRole) return block.visualRole
  if (block.type === 'hero') return 'heading'
  if (block.type === 'repeater') return 'list'
  if (block.type === 'button') {
    return block.action?.type === 'submitData' ? 'primaryAction' : 'secondaryAction'
  }
  return block.content.editable ? 'field' : 'body'
}

export function applyGeneratedVisualStyle(
  page: AiPagePlan,
  block: AiBlockPlan,
  props: Record<string, unknown>,
): Record<string, unknown> {
  const style = page.visualStyle
  if (!style) return props

  const role = resolveGeneratedVisualRole(block)
  const radius = style.cornerStyle === 'square'
    ? 0
    : style.cornerStyle === 'soft'
      ? 10
      : 18
  const compact = style.density === 'compact'

  if (block.type === 'hero') {
    return {
      ...props,
      textColor: style.textColor,
      contentPadding: compact ? 8 : 12,
    }
  }

  if (block.type === 'text') {
    if (block.content.editable || role === 'field') {
      return {
        ...props,
        contentPadding: compact ? 8 : 12,
        textColor: style.textColor,
        labelColor: style.textColor,
        placeholderColor: style.mutedTextColor,
        backgroundColor: style.surfaceColor,
        borderColor: style.borderColor,
        borderWidth: 1,
        borderRadius: radius,
      }
    }
    return {
      ...props,
      contentPadding: compact ? 2 : 4,
      textColor: role === 'heading' ? style.textColor : style.mutedTextColor,
    }
  }

  if (block.type === 'button') {
    const primary = role !== 'secondaryAction'
    return {
      ...props,
      contentPadding: compact ? 6 : 8,
      buttonPaddingX: compact ? 12 : 16,
      buttonPaddingY: compact ? 8 : 10,
      backgroundColor: primary ? style.primaryColor : style.surfaceColor,
      textColor: primary ? style.primaryTextColor : style.textColor,
      borderRadius: radius,
    }
  }

  return {
    ...props,
    backgroundColor: style.surfaceColor,
    borderColor: style.borderColor,
    borderWidth: 1,
    borderRadius: radius,
    opacity: 1,
  }
}
