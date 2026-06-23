function clampValue(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.min(100, parsed))
}

export function ProgressBarBlock({
  label = 'Progress',
  value = 65,
  showLabel = true,
  trackColor = '#e2e8f0',
  fillColor = '#2563eb',
  textColor = '#475569',
  borderRadius = 999,
}: {
  label?: string
  value?: number
  showLabel?: boolean
  trackColor?: string
  fillColor?: string
  textColor?: string
  borderRadius?: number
}) {
  const safeValue = clampValue(value)

  return (
    <div
      aria-label="Progress bar block"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 6,
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {showLabel ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 8,
            color: textColor || '#475569',
            fontSize: 12,
            fontWeight: 700,
            lineHeight: 1.1,
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label || 'Progress'}</span>
          <span>{Math.round(safeValue)}%</span>
        </div>
      ) : null}
      <div
        style={{
          width: '100%',
          height: showLabel ? 10 : '100%',
          minHeight: 8,
          borderRadius: Math.max(0, Number(borderRadius) || 0),
          backgroundColor: trackColor || '#e2e8f0',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${safeValue}%`,
            height: '100%',
            borderRadius: 'inherit',
            backgroundColor: fillColor || '#2563eb',
          }}
        />
      </div>
    </div>
  )
}
