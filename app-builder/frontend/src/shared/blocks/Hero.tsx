import { blockFontCss } from '../schema/fonts'
import type { CSSProperties, ReactNode } from 'react'

export function getHeroRootStyle(contentScale = 1, contentPadding = 16): CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    width: '100%',
    boxSizing: 'border-box',
    padding: contentPadding * contentScale,
    overflow: 'hidden',
    fontFamily: 'inherit',
  }
}

export function getHeroHeadlineStyle(
  headlineSize?: number,
  contentScale = 1,
  textColor = '#0f172a',
): CSSProperties {
  return {
    margin: 0,
    width: '100%',
    minWidth: 0,
    padding: 0,
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    fontSize: (headlineSize ?? 28) * contentScale,
    fontWeight: 700,
    lineHeight: 1.15,
    color: textColor,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
  }
}

export function HeroLayout({
  fontFamily,
  headline,
  headlineSize,
  contentPadding,
  textColor,
  contentScale = 1,
}: {
  headline: ReactNode
  headlineSize?: number
  contentPadding?: number
  textColor?: string
  fontFamily?: string
  contentScale?: number
}) {
  return (
    <div style={{ ...getHeroRootStyle(contentScale, contentPadding), fontFamily: blockFontCss(fontFamily) }}>
      <div style={getHeroHeadlineStyle(headlineSize, contentScale, textColor)}>{headline}</div>
    </div>
  )
}

export function Hero({
  fontFamily,
  headline,
  headlineSize,
  contentPadding,
  textColor,
  contentScale = 1,
}: {
  headline: string
  headlineSize?: number
  contentPadding?: number
  textColor?: string
  fontFamily?: string
  contentScale?: number
}) {
  return <HeroLayout fontFamily={fontFamily} headline={headline} headlineSize={headlineSize} contentPadding={contentPadding} textColor={textColor} contentScale={contentScale} />
}
