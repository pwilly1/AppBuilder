export function NavButton({
  label,
  toPageId,
  onNavigate,
  fontSize,
  contentPadding = 12,
  buttonPaddingX = 14,
  buttonPaddingY = 10,
  borderRadius = 10,
  backgroundColor = '#0f172a',
  textColor = '#ffffff',
  contentScale = 1,
}: {
  label?: string
  toPageId?: string
  onNavigate?: (pageId: string) => void
  fontSize?: number
  contentPadding?: number
  buttonPaddingX?: number
  buttonPaddingY?: number
  borderRadius?: number
  backgroundColor?: string
  textColor?: string
  contentScale?: number
}) {
  const text = label || 'Go'
  const disabled = !toPageId

  return (
    <div
      style={{
        display: 'inline-flex',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        boxSizing: 'border-box',
        padding: contentPadding * contentScale,
        overflow: 'visible',
      }}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!toPageId) return
          onNavigate?.(toPageId)
        }}
        style={{
          border: 'none',
          borderRadius: borderRadius * contentScale,
          padding: `${buttonPaddingY * contentScale}px ${buttonPaddingX * contentScale}px`,
          backgroundColor: disabled ? '#e5e7eb' : backgroundColor || '#0f172a',
          color: disabled ? '#475569' : textColor || '#ffffff',
          fontSize: (fontSize ?? 14) * contentScale,
          fontWeight: 600,
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
          cursor: disabled ? 'default' : 'pointer',
        }}
      >
        {text}
      </button>
    </div>
  )
}
