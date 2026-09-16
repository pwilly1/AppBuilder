import { blockFontCss, blockTypographyStyle, type BlockTypographyProps } from '../schema/fonts'
export function BadgeBlock({
  typography = {},
  fontFamily,
  text = 'Badge',
  fontSize = 13,
  backgroundColor = '#f7f1e6',
  textColor = '#0c1830',
  borderColor = '#dbe3ef',
  borderRadius = 999,
  paddingX = 12,
  paddingY = 6,
}: {
  typography?: BlockTypographyProps
  fontFamily?: string
  text?: string
  fontSize?: number
  backgroundColor?: string
  textColor?: string
  borderColor?: string
  borderRadius?: number
  paddingX?: number
  paddingY?: number
}) {
  return (
    <div
      aria-label="Badge block"
      style={{
        fontFamily: blockFontCss(fontFamily),
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <span data-block-typography
        style={{
          display: 'inline-flex',
          maxWidth: '100%',
          boxSizing: 'border-box',
          border: `1px solid ${borderColor || 'transparent'}`,
          borderRadius: Math.max(0, Number(borderRadius) || 0),
          backgroundColor: backgroundColor || '#f7f1e6',
          color: textColor || '#0c1830',
          fontSize: Math.max(8, Number(fontSize) || 13),
          fontWeight: 700,
          lineHeight: 1.15,
          ...blockTypographyStyle(typography),
          padding: `${Math.max(0, Number(paddingY) || 0)}px ${Math.max(0, Number(paddingX) || 0)}px`,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {text || 'Badge'}
      </span>
    </div>
  )
}
