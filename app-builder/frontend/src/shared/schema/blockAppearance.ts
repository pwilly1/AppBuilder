import type { CSSProperties } from 'react'

export type BlockAppearanceProps = {
  backgroundColor?: string
  borderColor?: string
  borderWidth?: number
  borderRadius?: number
  contentPadding?: number
  textSurfaceEnabled?: boolean
}

export function appearanceNumber(value: unknown, fallback: number, max = 96): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : fallback
}

export function appearanceColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^(transparent|#[0-9a-f]{6})$/i.test(value) ? value : fallback
}

export function blockSurfaceStyle(type: string, props: Record<string, unknown>, scale = 1): CSSProperties {
  if (type === 'text' && props.textSurfaceEnabled !== true) return {}
  const width = appearanceNumber(props.borderWidth, type === 'text' ? 1 : 0, 12) * scale
  return {
    backgroundColor: appearanceColor(props.backgroundColor, type === 'button' ? '#2563eb' : type === 'text' ? '#ffffff' : 'transparent'),
    border: `${width}px solid ${appearanceColor(props.borderColor, '#cbd5e1')}`,
    borderRadius: appearanceNumber(props.borderRadius, type === 'button' ? 10 : type === 'text' ? 12 : 0, 999) * scale,
    boxSizing: 'border-box',
  }
}

export function blockPadding(type: string, props: Record<string, unknown>, scale = 1): number {
  return appearanceNumber(props.contentPadding, type === 'hero' ? 16 : 12) * scale
}
