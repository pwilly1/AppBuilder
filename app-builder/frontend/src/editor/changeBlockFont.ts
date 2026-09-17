import { blockFontCss, blockTypographyStyle, normalizeBlockFont, normalizeTypography, type BlockFontFamily, type BlockTypographyProps } from '../shared/schema/fonts'
import { getChildOwnerSpan } from '../shared/schema/blockHierarchy'
import { getBlockContentScale } from '../shared/schema/contentScale'
import { GRID_COLUMN_COUNT, GRID_DEFAULT_ROW_COUNT, getColumnWidth, type GridMetrics } from '../shared/schema/gridLayout'
import type { Block, GridPlacement } from '../shared/schema/types'
import { findFontPlacement } from './fontPlacement'
import { blockSurfaceStyle, blockPadding, type BlockAppearanceProps } from '../shared/schema/blockAppearance'

export async function changeBlockFont(block: Block, pageBlocks: Block[], fontFamily: BlockFontFamily): Promise<Block> {
  return changeBlockTypography(block, pageBlocks, { fontFamily })
}

export async function changeBlockTypography(block: Block, pageBlocks: Block[], changes: BlockTypographyProps): Promise<Block> {
  return changeBlockPresentation(block, pageBlocks, { ...normalizeTypography(changes), ...(changes.fontFamily === undefined ? {} : { fontFamily: normalizeBlockFont(changes.fontFamily) }) })
}

export async function changeBlockPresentation(block: Block, pageBlocks: Block[], changes: BlockTypographyProps & BlockAppearanceProps): Promise<Block> {
  const props = { ...block.props, ...changes }
  const fontFamily = normalizeBlockFont(props.fontFamily)
  const source = Array.from(document.querySelectorAll<HTMLElement>('[data-editor-block-content]'))
    .find((node) => node.dataset.editorBlockContent === block.id)
  const grid = block.layout?.grid
  if (!source || !grid || !source.dataset.gridMetrics) {
    throw new Error('Open this block on the canvas before changing its text styling.')
  }
  const css = fontFamily === 'default' ? getComputedStyle(document.body).fontFamily : blockFontCss(fontFamily)
  if (fontFamily !== 'default') {
    const faces = await Promise.all([400, 700].map((weight) => document.fonts.load(`${weight} 16px ${css}`)))
    if (faces.some((loaded) => loaded.length === 0)) throw new Error('The font could not load. Please try again.')
  }
  if (!source.isConnected) throw new Error('The selected block changed. Please try again.')
  const metrics = JSON.parse(source.dataset.gridMetrics) as GridMetrics
  const columnStep = getColumnWidth(metrics) + (metrics.gap ?? 0)
  const rowStep = (metrics.rowHeight ?? 28) + (metrics.gap ?? 0)
  const parent = pageBlocks.find((candidate) => candidate.id === block.parentId)
  const span = parent ? getChildOwnerSpan(parent) : {
    cols: metrics.columnCount ?? GRID_COLUMN_COUNT,
    rows: Number(source.dataset.ownerRows) || GRID_DEFAULT_ROW_COUNT,
  }
  const clone = source.cloneNode(true) as HTMLElement
  clone.removeAttribute('data-editor-block-content')
  clone.setAttribute('aria-hidden', 'true')
  clone.inert = true
  Object.assign(clone.style, {
    position: 'fixed', left: '-10000px', top: '0', visibility: 'hidden',
    transform: 'none', pointerEvents: 'none', fontFamily: css,
  })
  const nodes = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))]
  for (const node of nodes) {
    node.removeAttribute('id')
    if (node.style.fontFamily) node.style.fontFamily = css
    if (node.hasAttribute('data-block-surface')) {
      const surface = blockSurfaceStyle(block.type, props, getBlockContentScale(block))
      Object.assign(node.style, surface, { borderRadius: `${surface.borderRadius ?? 0}px` })
      if (block.type === 'text' && props.textSurfaceEnabled !== true) {
        Object.assign(node.style, { backgroundColor: 'transparent', border: '0px solid transparent' })
      }
    }
    if (node.hasAttribute('data-block-padding')) node.style.padding = `${blockPadding(block.type, props, getBlockContentScale(block))}px`
    if (node.hasAttribute('data-block-typography')) {
      const style = blockTypographyStyle(props, getBlockContentScale(block))
      Object.assign(node.style, style, {
        ...(style.letterSpacing === undefined ? {} : { letterSpacing: `${style.letterSpacing}px` }),
      })
    }
  }
  // cloneNode does not consistently copy the live value of form controls.
  const originals = source.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input,textarea')
  clone.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input,textarea').forEach((node, i) => {
    node.value = originals[i].value
  })
  const width = source.clientWidth
  const height = source.clientHeight
  const size = (placement: GridPlacement) => ({
    width: width + (placement.colSpan - grid.colSpan) * columnStep,
    height: height + (placement.rowSpan - grid.rowSpan) * rowStep,
  })
  document.body.appendChild(clone)
  try {
    const nextGrid = findFontPlacement(block, pageBlocks, span, (placement) => {
      const rect = size(placement)
      Object.assign(clone.style, { width: `${rect.width}px`, maxWidth: `${rect.width}px`, height: `${rect.height}px` })
      return nodes.every((node) =>
        (!node.clientWidth || node.scrollWidth <= node.clientWidth + 1)
        // Match the inline editor's allowance for glyph descent and fractional line boxes.
        && (!node.clientHeight || node.scrollHeight <= node.clientHeight + 6),
      )
    })
    if (!nextGrid) throw new Error('This text styling needs more room. Move nearby blocks or enlarge the available area, then try again.')
    const grew = nextGrid.colSpan !== grid.colSpan || nextGrid.rowSpan !== grid.rowSpan
    const scale = getBlockContentScale(block)
    const nextSize = size(nextGrid)
    return {
      ...block,
      props,
      ...(grew ? {
        layout: {
          ...block.layout, grid: nextGrid,
          ...(block.layout?.resizeBehavior === 'scaleContent' ? {
            scaleBase: { colSpan: nextGrid.colSpan / scale, rowSpan: nextGrid.rowSpan / scale },
          } : {}),
        },
        render: { ...block.render, widthPx: nextSize.width, heightPx: nextSize.height },
      } : {}),
    }
  } finally {
    clone.remove()
  }
}
