export function ImageBlock({
  src = '',
  alt = 'Image',
  fit = 'cover',
  positionX = 50,
  positionY = 50,
  backgroundColor = '#e2e8f0',
  borderColor = 'transparent',
  borderWidth = 0,
  borderRadius = 16,
  opacity = 1,
}: {
  src?: string
  alt?: string
  fit?: 'cover' | 'contain' | 'fill'
  positionX?: number
  positionY?: number
  backgroundColor?: string
  borderColor?: string
  borderWidth?: number
  borderRadius?: number
  opacity?: number
}) {
  const safeFit = fit === 'contain' || fit === 'fill' ? fit : 'cover'
  const safePositionX = Math.max(0, Math.min(100, Number(positionX) || 50))
  const safePositionY = Math.max(0, Math.min(100, Number(positionY) || 50))
  const safeBorderWidth = Math.max(0, Number(borderWidth) || 0)
  const safeBorderRadius = Math.max(0, Number(borderRadius) || 0)
  const safeOpacity = Math.max(0, Math.min(1, Number(opacity) || 0))
  const hasSource = typeof src === 'string' && src.trim().length > 0

  return (
    <div
      aria-label={alt || 'Image block'}
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        border: safeBorderWidth > 0 ? `${safeBorderWidth}px solid ${borderColor || 'transparent'}` : undefined,
        borderRadius: safeBorderRadius,
        backgroundColor: backgroundColor || '#e2e8f0',
        opacity: safeOpacity,
        pointerEvents: 'none',
      }}
    >
      {hasSource ? (
        <img
          src={src}
          alt={alt || ''}
          draggable={false}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: safeFit,
            objectPosition: `${safePositionX}% ${safePositionY}%`,
          }}
        />
      ) : (
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 12,
            boxSizing: 'border-box',
            color: '#64748b',
            fontSize: 13,
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          Add image
        </div>
      )}
    </div>
  )
}
