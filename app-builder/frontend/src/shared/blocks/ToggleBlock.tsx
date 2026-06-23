export function ToggleBlock({
  label = 'Toggle',
  checked = true,
  fontSize = 14,
  textColor = '#0f172a',
  activeColor = '#2563eb',
  inactiveColor = '#cbd5e1',
  knobColor = '#ffffff',
}: {
  label?: string
  checked?: boolean
  fontSize?: number
  textColor?: string
  activeColor?: string
  inactiveColor?: string
  knobColor?: string
}) {
  const safeFontSize = Math.max(8, Number(fontSize) || 14)
  const trackWidth = Math.max(34, safeFontSize * 2.8)
  const trackHeight = Math.max(18, safeFontSize * 1.55)
  const knobSize = trackHeight - 4

  return (
    <div
      aria-label="Toggle block"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        pointerEvents: 'none',
        color: textColor || '#0f172a',
        fontSize: safeFontSize,
        lineHeight: 1.2,
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          maxWidth: '100%',
        }}
      >
        <span
          style={{
            position: 'relative',
            display: 'inline-flex',
            width: trackWidth,
            height: trackHeight,
            flex: '0 0 auto',
            borderRadius: 999,
            backgroundColor: checked ? activeColor || '#2563eb' : inactiveColor || '#cbd5e1',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 2,
              left: checked ? trackWidth - knobSize - 2 : 2,
              width: knobSize,
              height: knobSize,
              borderRadius: 999,
              backgroundColor: knobColor || '#ffffff',
              boxShadow: '0 1px 4px rgba(15,23,42,0.18)',
            }}
          />
        </span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label || 'Toggle'}</span>
      </span>
    </div>
  )
}
