export function NavButton({
  label,
  toPageId,
  onNavigate,
}: {
  label?: string
  toPageId?: string
  onNavigate?: (pageId: string) => void
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
        padding: 12,
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
          borderRadius: 10,
          padding: '10px 14px',
          backgroundColor: disabled ? '#e5e7eb' : '#0f172a',
          color: disabled ? '#475569' : '#ffffff',
          fontSize: 14,
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
