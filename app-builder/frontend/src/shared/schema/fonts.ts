import type { BlockType } from './types'

export const BLOCK_FONTS = [
  { id: 'default', label: 'Default', css: 'var(--font-sans)' },
  { id: 'lato', label: 'Lato (Sans serif)', css: '"Apptura Lato", sans-serif' },
  { id: 'lusitana', label: 'Lusitana (Serif)', css: '"Apptura Lusitana", serif' },
  { id: 'spaceMono', label: 'Space Mono (Monospace)', css: '"Apptura Space Mono", monospace' },
] as const

export type BlockFontFamily = typeof BLOCK_FONTS[number]['id']
export type BlockTypographyProps = { fontFamily?: BlockFontFamily }

export function normalizeBlockFont(value: unknown): BlockFontFamily {
  return BLOCK_FONTS.find((font) => font.id === value)?.id ?? 'default'
}

export function blockFontCss(value: unknown): string {
  return BLOCK_FONTS.find((font) => font.id === normalizeBlockFont(value))!.css
}

export function supportsBlockFont(type: BlockType): boolean {
  return ['hero', 'text', 'button', 'badge', 'checkbox', 'toggle', 'progressBar'].includes(type)
}
