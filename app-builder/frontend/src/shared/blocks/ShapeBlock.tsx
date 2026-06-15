type ShapeType = 'rectangle' | 'circle' | 'pill'

function clampOpacity(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 1
  return Math.max(0, Math.min(1, parsed))
}

export function ShapeBlock({
  shapeType = 'rectangle',
  fillColor = '#dbeafe',
  borderColor = '#2563eb',
  borderWidth = 0,
  borderRadius = 18,
  opacity = 1,
}: {
  shapeType?: ShapeType
  fillColor?: string
  borderColor?: string
  borderWidth?: number
  borderRadius?: number
  opacity?: number
}) {
  const radius =
    shapeType === 'circle'
      ? '9999px'
      : shapeType === 'pill'
        ? '9999px'
        : `${Math.max(0, Number(borderRadius) || 0)}px`

  return (
    <div
      aria-label="Shape block"
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        backgroundColor: fillColor || '#dbeafe',
        border: `${Math.max(0, Number(borderWidth) || 0)}px solid ${borderColor || 'transparent'}`,
        borderRadius: radius,
        opacity: clampOpacity(opacity),
        pointerEvents: 'none',
      }}
    />
  )
}
