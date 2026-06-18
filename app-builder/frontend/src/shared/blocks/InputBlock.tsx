export function InputBlock({
  label = 'Label',
  placeholder = 'Placeholder',
  value = '',
  inputType = 'text',
  fontSize = 14,
  backgroundColor = '#ffffff',
  textColor = '#0f172a',
  placeholderColor = '#94a3b8',
  borderColor = '#cbd5e1',
  borderRadius = 12,
}: {
  label?: string
  placeholder?: string
  value?: string
  inputType?: string
  fontSize?: number
  backgroundColor?: string
  textColor?: string
  placeholderColor?: string
  borderColor?: string
  borderRadius?: number
}) {
  const displayValue = value || placeholder
  const isPlaceholder = !value
  const safeFontSize = Math.max(8, Number(fontSize) || 14)
  const safeRadius = Math.max(0, Number(borderRadius) || 0)

  return (
    <div
      aria-label={`${inputType || 'text'} input block`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        padding: 8,
        pointerEvents: 'none',
      }}
    >
      {label ? (
        <div
          style={{
            color: '#475569',
            fontSize: Math.max(8, safeFontSize - 2),
            fontWeight: 600,
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </div>
      ) : null}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          minHeight: 0,
          flex: 1,
          width: '100%',
          boxSizing: 'border-box',
          border: `1px solid ${borderColor || '#cbd5e1'}`,
          borderRadius: safeRadius,
          backgroundColor: backgroundColor || '#ffffff',
          color: isPlaceholder ? placeholderColor || '#94a3b8' : textColor || '#0f172a',
          fontSize: safeFontSize,
          lineHeight: 1.3,
          padding: '0 12px',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}
      >
        {displayValue}
      </div>
    </div>
  )
}
