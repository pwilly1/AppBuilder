export function CheckboxBlock({
  label = 'Checkbox',
  checked = true,
  fontSize = 14,
  textColor = '#0f172a',
  boxColor = '#2563eb',
  checkColor = '#ffffff',
  borderColor = '#94a3b8',
}: {
  label?: string
  checked?: boolean
  fontSize?: number
  textColor?: string
  boxColor?: string
  checkColor?: string
  borderColor?: string
}) {
  const safeFontSize = Math.max(8, Number(fontSize) || 14)

  return (
    <div
      aria-label="Checkbox block"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
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
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: Math.max(14, safeFontSize + 3),
          height: Math.max(14, safeFontSize + 3),
          flex: '0 0 auto',
          borderRadius: 5,
          border: `1px solid ${checked ? boxColor || '#2563eb' : borderColor || '#94a3b8'}`,
          backgroundColor: checked ? boxColor || '#2563eb' : 'transparent',
          color: checkColor || '#ffffff',
          fontSize: safeFontSize,
          fontWeight: 800,
        }}
      >
        {checked ? '✓' : ''}
      </span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label || 'Checkbox'}</span>
    </div>
  )
}
