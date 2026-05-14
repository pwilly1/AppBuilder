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

export function getHeroSubheadStyle(): CSSProperties {
  return {
    margin: '8px 0 0 0',
    width: '100%',
    minWidth: 0,
    padding: 0,
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    fontSize: 16,
    lineHeight: 1.45,
    color: '#475569',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
  }
}

export function HeroLayout({
  headline,
  subhead,
  headlineSize,
}: {
  headline: ReactNode
  subhead?: ReactNode
  headlineSize?: number
}) {
  return (
    <div style={getHeroRootStyle()}>
      <div style={getHeroHeadlineStyle(headlineSize)}>{headline}</div>
      {subhead ? <div style={getHeroSubheadStyle()}>{subhead}</div> : null}
    </div>
  )
}

export function Hero({
  headline,
  subhead,
  headlineSize,
}: {
  headline: string
  subhead?: string
  headlineSize?: number
}) {
  return <HeroLayout headline={headline} subhead={subhead} headlineSize={headlineSize} />
}
