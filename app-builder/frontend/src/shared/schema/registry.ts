// © 2025 Preston Willis. All rights reserved.
// Block registry with defaults and factories (no React imports)
import type { BlockType, Block } from './types'

export const BlockRegistry: Record<string, { displayName: string; defaultProps: Record<string, any> }> = {
  hero: {
    displayName: 'Hero',
    defaultProps: { headline: 'Headline', subhead: '' },
  },
  text: {
    displayName: 'Text',
    defaultProps: { value: 'Text', fontSize: 16 },
  },
}

export function createBlock<T extends BlockType = BlockType>(type: T, overrides: Record<string, any> = {}): Block {
  const def = BlockRegistry[type]
  const props = { ...(def?.defaultProps || {}), ...(overrides || {}) }
  return { id: crypto.randomUUID(), type, props }
}
