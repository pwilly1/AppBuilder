import { blockSurfaceStyle, blockPadding, type BlockAppearanceProps } from '../schema/blockAppearance'
import { blockFontCss, blockTypographyStyle, type BlockTypographyProps } from '../schema/fonts'
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
  appearance = {},
  typography = {},
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
  appearance?: BlockAppearanceProps
  typography?: BlockTypographyProps
  fontFamily?: string
  contentScale?: number
}) {
  return (
    <div data-block-surface data-block-padding style={{ ...getHeroRootStyle(contentScale, contentPadding), ...blockSurfaceStyle("hero", appearance, contentScale), padding: blockPadding("hero", { ...appearance, contentPadding }, contentScale), height: "100%", fontFamily: blockFontCss(fontFamily) }}>
      <div data-block-typography style={{ ...getHeroHeadlineStyle(headlineSize, contentScale, textColor), ...blockTypographyStyle(typography, contentScale) }}>{headline}</div>
    </div>
  )
}

export function Hero({
  appearance = {},
  typography = {},
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
  appearance?: BlockAppearanceProps
  typography?: BlockTypographyProps
  fontFamily?: string
  contentScale?: number
}) {
  return <HeroLayout appearance={appearance} typography={typography} fontFamily={fontFamily} headline={headline} headlineSize={headlineSize} contentPadding={contentPadding} textColor={textColor} contentScale={contentScale} />
}
