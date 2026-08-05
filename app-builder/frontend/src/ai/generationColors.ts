import type { AiBlockPlan, AiPagePlan } from '@apptura/shared/ai'

const DEFAULT_PAGE_BACKGROUND = '#ffffff'
const DEFAULT_TEXT_COLOR = '#0f172a'
const DEFAULT_PLACEHOLDER_COLOR = '#475569'
const DEFAULT_BUTTON_BACKGROUND = '#2563eb'
const DEFAULT_INPUT_BACKGROUND = '#ffffff'
const DEFAULT_INPUT_BORDER = '#cbd5e1'
const LIGHT_TEXT_COLOR = '#ffffff'
const LIGHT_MUTED_COLOR = '#cbd5e1'
const DARK_BORDER_COLOR = '#64748b'

const MINIMUM_TEXT_CONTRAST = 4.5
const MINIMUM_PLACEHOLDER_CONTRAST = 3
const MINIMUM_CONTROL_BOUNDARY_CONTRAST = 1.5

export function repairGeneratedBlockColors(
  page: AiPagePlan,
  block: AiBlockPlan,
  props: Record<string, unknown>,
): Record<string, unknown> {
  const surroundingBackground = getSurroundingBackground(page, block)

  if (block.type === 'hero') {
    return {
      ...props,
      textColor: ensureReadableColor(
        readColor(props.textColor, DEFAULT_TEXT_COLOR),
        surroundingBackground,
        MINIMUM_TEXT_CONTRAST,
        [DEFAULT_TEXT_COLOR, LIGHT_TEXT_COLOR],
      ),
    }
  }

  if (block.type === 'text') {
    if (props.editable !== true) {
      return {
        ...props,
        textColor: ensureReadableColor(
          readColor(props.textColor, DEFAULT_TEXT_COLOR),
          surroundingBackground,
          MINIMUM_TEXT_CONTRAST,
          [DEFAULT_TEXT_COLOR, LIGHT_TEXT_COLOR],
        ),
      }
    }

    const inputBackground = readColor(props.backgroundColor, DEFAULT_INPUT_BACKGROUND)
    const textColor = ensureReadableColor(
      readColor(props.textColor, DEFAULT_TEXT_COLOR),
      inputBackground,
      MINIMUM_TEXT_CONTRAST,
      [DEFAULT_TEXT_COLOR, LIGHT_TEXT_COLOR],
    )
    const placeholderColor = ensureReadableColor(
      readColor(props.placeholderColor, DEFAULT_PLACEHOLDER_COLOR),
      inputBackground,
      MINIMUM_PLACEHOLDER_CONTRAST,
      [DEFAULT_PLACEHOLDER_COLOR, LIGHT_MUTED_COLOR, DEFAULT_TEXT_COLOR, LIGHT_TEXT_COLOR],
    )
    const labelColor = ensureReadableColor(
      readColor(props.labelColor, readColor(props.textColor, DEFAULT_TEXT_COLOR)),
      surroundingBackground,
      MINIMUM_TEXT_CONTRAST,
      [DEFAULT_TEXT_COLOR, LIGHT_TEXT_COLOR],
    )
    const borderWidth = readNumber(props.borderWidth, 1)
    const borderColor = borderWidth > 0
      ? ensureReadableColor(
          readColor(props.borderColor, DEFAULT_INPUT_BORDER),
          inputBackground,
          MINIMUM_CONTROL_BOUNDARY_CONTRAST,
          [DARK_BORDER_COLOR, LIGHT_MUTED_COLOR, DEFAULT_TEXT_COLOR, LIGHT_TEXT_COLOR],
        )
      : readColor(props.borderColor, DEFAULT_INPUT_BORDER)

    return {
      ...props,
      textColor,
      placeholderColor,
      labelColor,
      borderColor,
    }
  }

  if (block.type === 'button') {
    const backgroundColor = ensureDistinctSurfaceColor(
      readColor(props.backgroundColor, DEFAULT_BUTTON_BACKGROUND),
      surroundingBackground,
    )
    return {
      ...props,
      backgroundColor,
      textColor: ensureReadableColor(
        readColor(props.textColor, LIGHT_TEXT_COLOR),
        backgroundColor,
        MINIMUM_TEXT_CONTRAST,
        [LIGHT_TEXT_COLOR, DEFAULT_TEXT_COLOR],
      ),
    }
  }

  if (block.type === 'repeater') {
    const backgroundColor = readColor(props.backgroundColor, surroundingBackground)
    const borderWidth = readNumber(props.borderWidth, 0)
    if (borderWidth <= 0) return props
    return {
      ...props,
      borderColor: ensureReadableColor(
        readColor(props.borderColor, DEFAULT_INPUT_BORDER),
        backgroundColor,
        MINIMUM_CONTROL_BOUNDARY_CONTRAST,
        [DARK_BORDER_COLOR, LIGHT_MUTED_COLOR, DEFAULT_TEXT_COLOR, LIGHT_TEXT_COLOR],
      ),
    }
  }

  return props
}

export function getColorContrastRatio(first: string, second: string): number {
  const firstLuminance = getRelativeLuminance(first)
  const secondLuminance = getRelativeLuminance(second)
  const lighter = Math.max(firstLuminance, secondLuminance)
  const darker = Math.min(firstLuminance, secondLuminance)
  return (lighter + 0.05) / (darker + 0.05)
}

function getSurroundingBackground(page: AiPagePlan, block: AiBlockPlan): string {
  const pageBackground = page.backgroundColor ?? DEFAULT_PAGE_BACKGROUND
  if (!block.parentKey) return pageBackground

  const parent = page.blocks.find((candidate) => candidate.key === block.parentKey)
  if (parent?.type !== 'repeater' || !parent.content?.backgroundColor) return pageBackground
  const opacity = clamp(parent.content.opacity ?? 1, 0, 1)
  return blendColors(parent.content.backgroundColor, pageBackground, opacity)
}

function ensureDistinctSurfaceColor(color: string, surroundingBackground: string): string {
  if (getColorContrastRatio(color, surroundingBackground) >= MINIMUM_CONTROL_BOUNDARY_CONTRAST) {
    return color
  }

  if (getColorContrastRatio(DEFAULT_BUTTON_BACKGROUND, surroundingBackground) >= 2) {
    return DEFAULT_BUTTON_BACKGROUND
  }

  return highestContrastColor(surroundingBackground, [DEFAULT_TEXT_COLOR, LIGHT_TEXT_COLOR])
}

function ensureReadableColor(
  color: string,
  background: string,
  minimumContrast: number,
  fallbacks: readonly string[],
): string {
  if (getColorContrastRatio(color, background) >= minimumContrast) return color
  return fallbacks.find((candidate) => (
    getColorContrastRatio(candidate, background) >= minimumContrast
  )) ?? highestContrastColor(background, fallbacks)
}

function highestContrastColor(background: string, candidates: readonly string[]): string {
  return candidates.reduce((best, candidate) => (
    getColorContrastRatio(candidate, background) > getColorContrastRatio(best, background)
      ? candidate
      : best
  ))
}

function getRelativeLuminance(color: string): number {
  const [red, green, blue] = hexToRgb(color).map((channel) => {
    const normalized = channel / 255
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  })
  return red * 0.2126 + green * 0.7152 + blue * 0.0722
}

function blendColors(foreground: string, background: string, opacity: number): string {
  const foregroundChannels = hexToRgb(foreground)
  const backgroundChannels = hexToRgb(background)
  return rgbToHex(foregroundChannels.map((channel, index) => (
    Math.round(channel * opacity + backgroundChannels[index] * (1 - opacity))
  )))
}

function hexToRgb(color: string): [number, number, number] {
  const normalized = /^#[0-9a-f]{6}$/i.test(color) ? color : DEFAULT_PAGE_BACKGROUND
  return [
    Number.parseInt(normalized.slice(1, 3), 16),
    Number.parseInt(normalized.slice(3, 5), 16),
    Number.parseInt(normalized.slice(5, 7), 16),
  ]
}

function rgbToHex(channels: number[]): string {
  return `#${channels.map((channel) => (
    clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0')
  )).join('')}`
}

function readColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
}

function readNumber(value: unknown, fallback: number): number {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}
