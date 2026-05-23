import type { CSSProperties, ReactNode } from 'react'

export function getHeroRootStyle(): CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    width: '100%',
    boxSizing: 'border-box',
    padding: 16,
    overflow: 'hidden',
    fontFamily: 'inherit',
  }
}

export function getHeroHeadlineStyle(headlineSize?: number): CSSProperties {
  return {
    margin: 0,
    width: '100%',
    minWidth: 0,
    padding: 0,
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    fontSize: headlineSize ?? 28,
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
}: {
  headline: ReactNode
  headlineSize?: number
}) {
  return (
    <div style={getHeroRootStyle()}>
      <div style={getHeroHeadlineStyle(headlineSize)}>{headline}</div>
    </div>
  )
}

export function Hero({
  headline,
  headlineSize,
}: {
  headline: string
  headlineSize?: number
}) {
  return <HeroLayout headline={headline} headlineSize={headlineSize} />
}
