const iconMap: Record<string, string> = {
  star: '★',
  check: '✓',
  home: '⌂',
  search: '⌕',
  user: '●',
  heart: '♥',
  bell: '◔',
  plus: '+',
  arrow: '→',
}

export function IconBlock({
  iconName = 'star',
  fontSize = 28,
  color = '#2563eb',
  backgroundColor = '#ffffff',
  borderRadius = 999,
}: {
  iconName?: string
  fontSize?: number
  color?: string
      backgroundColor?: string
  borderRadius?: number
}) {
  return (
    <div
      aria-label={`${iconName || 'star'} icon block`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        pointerEvents: 'none',
        borderRadius: Math.max(0, Number(borderRadius) || 0),
        backgroundColor: backgroundColor || '#ffffff',
        color: color || '#2563eb',
        fontSize: Math.max(8, Number(fontSize) || 28),
        fontWeight: 800,
        lineHeight: 1,
      }}
    >
      {iconMap[iconName || 'star'] || iconMap.star}
    </div>
  )
}
