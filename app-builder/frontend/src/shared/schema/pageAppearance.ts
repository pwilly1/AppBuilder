export const DEFAULT_PAGE_BACKGROUND_COLOR = '#ffffff'

export function normalizePageBackgroundColor(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_PAGE_BACKGROUND_COLOR
  const normalized = value.trim().toLowerCase()
  return /^#[0-9a-f]{6}$/.test(normalized) ? normalized : DEFAULT_PAGE_BACKGROUND_COLOR
}
