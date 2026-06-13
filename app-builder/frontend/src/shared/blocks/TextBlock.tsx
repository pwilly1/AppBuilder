export function TextBlock({
  value,
  fontSize,
  contentPadding = 12,
  contentScale = 1,
}: {
  value: string
  fontSize?: number
  contentPadding?: number
  contentScale?: number
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        width: '100%',
        boxSizing: 'border-box',
        padding: contentPadding * contentScale,
        overflow: 'hidden',
      }}
    >
      <p
        style={{
          margin: 0,
          width: '100%',
          minWidth: 0,
          fontSize: (fontSize ?? 16) * contentScale,
          lineHeight: 1.45,
          color: '#0f172a',
          whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word',
        }}
      >
        {value}
      </p>
    </div>
  )
}
