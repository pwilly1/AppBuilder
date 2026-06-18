type DividerOrientation = 'horizontal' | 'vertical'

export function DividerBlock({
  orientation = 'horizontal',
  color = '#cbd5e1',
  thickness = 2,
}: {
  orientation?: DividerOrientation
  color?: string
  thickness?: number
}) {
  const safeThickness = Math.max(1, Number(thickness) || 1)
  const isVertical = orientation === 'vertical'

  return (
    <div
      aria-label="Divider block"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: isVertical ? safeThickness : '100%',
          height: isVertical ? '100%' : safeThickness,
          backgroundColor: color || '#cbd5e1',
          borderRadius: 999,
        }}
      />
    </div>
  )
}
