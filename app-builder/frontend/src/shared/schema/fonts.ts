import type { BlockType } from './types'

export const BLOCK_FONTS = [
  { id: 'default', label: 'Default', css: 'var(--font-sans)' },
  { id: 'lato', label: 'Lato (Sans serif)', css: '"Apptura Lato", sans-serif' },
  { id: 'lusitana', label: 'Lusitana (Serif)', css: '"Apptura Lusitana", serif' },
  { id: 'spaceMono', label: 'Space Mono (Monospace)', css: '"Apptura Space Mono", monospace' },
] as const

export type BlockFontFamily = typeof BLOCK_FONTS[number]['id']
export type BlockTypographyProps = {
  fontFamily?: BlockFontFamily
  fontWeight?: 400 | 700
  fontStyle?: 'normal' | 'italic'
  textDecoration?: 'none' | 'underline'
  textAlign?: 'left' | 'center' | 'right'
  lineHeight?: number
  letterSpacing?: number
}

export function normalizeTypography(value: Record<string, unknown>): BlockTypographyProps {
  return {
    ...(value.fontWeight === 400 || value.fontWeight === 700 ? { fontWeight: value.fontWeight } : {}),
    ...(value.fontStyle === 'normal' || value.fontStyle === 'italic' ? { fontStyle: value.fontStyle } : {}),
    ...(value.textDecoration === 'none' || value.textDecoration === 'underline' ? { textDecoration: value.textDecoration } : {}),
    ...(value.textAlign === 'left' || value.textAlign === 'center' || value.textAlign === 'right' ? { textAlign: value.textAlign } : {}),
    ...(typeof value.lineHeight === 'number' && Number.isFinite(value.lineHeight) ? { lineHeight: Math.max(1, Math.min(3, value.lineHeight)) } : {}),
    ...(typeof value.letterSpacing === 'number' && Number.isFinite(value.letterSpacing) ? { letterSpacing: Math.max(-2, Math.min(10, value.letterSpacing)) } : {}),
  }
}

// Unitless line height scales with font size; letter spacing is stored in design pixels.
export function blockTypographyStyle(value: Record<string, unknown> = {}, scale = 1) {
  const style = normalizeTypography(value)
  return { ...style, ...(style.letterSpacing === undefined ? {} : { letterSpacing: style.letterSpacing * scale }) }
}

export function defaultTextWeight(type: BlockType): 400 | 700 {
  return ['hero', 'button', 'badge', 'progressBar'].includes(type) ? 700 : 400
}

export function defaultLineHeight(type: BlockType): number {
  if (type === 'hero' || type === 'badge') return 1.15
  if (type === 'button' || type === 'progressBar') return 1.1
  if (type === 'text') return 1.45
  return 1.2
}

export function normalizeBlockFont(value: unknown): BlockFontFamily {
  return BLOCK_FONTS.find((font) => font.id === value)?.id ?? 'default'
}

export function blockFontCss(value: unknown): string {
  return BLOCK_FONTS.find((font) => font.id === normalizeBlockFont(value))!.css
}

export function supportsBlockFont(type: BlockType): boolean {
  return ['hero', 'text', 'button', 'badge', 'checkbox', 'toggle', 'progressBar'].includes(type)
}
