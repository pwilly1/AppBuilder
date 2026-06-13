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

export function getHeroHeadlineStyle(headlineSize?: number, contentScale = 1): CSSProperties {
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
    color: '#0f172a',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
  }
}

export function HeroLayout({
  headline,
  headlineSize,
  contentPadding,
  contentScale = 1,
}: {
  headline: ReactNode
  headlineSize?: number
  contentPadding?: number
  contentScale?: number
}) {
  return (
    <div style={getHeroRootStyle(contentScale, contentPadding)}>
      <div style={getHeroHeadlineStyle(headlineSize, contentScale)}>{headline}</div>
    </div>
  )
}

export function Hero({
  headline,
  headlineSize,
  contentPadding,
  contentScale = 1,
}: {
  headline: string
  headlineSize?: number
  contentPadding?: number
  contentScale?: number
}) {
  return <HeroLayout headline={headline} headlineSize={headlineSize} contentPadding={contentPadding} contentScale={contentScale} />
}
