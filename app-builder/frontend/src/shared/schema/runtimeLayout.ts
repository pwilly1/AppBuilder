import type { Block, BlockEditorPlacement } from './types'

export function getBlockEditorPlacement(block: Block, index = 0): Required<BlockEditorPlacement> {
  const legacy = (block.props || {}) as Record<string, any>
  const placement = block.editorPlacement || {}
  const x = typeof placement.x === 'number' ? placement.x : typeof legacy.x === 'number' ? legacy.x : 0
  const y = typeof placement.y === 'number' ? placement.y : typeof legacy.y === 'number' ? legacy.y : index * 120
  const scaleX =
    typeof placement.scaleX === 'number'
      ? placement.scaleX
      : typeof placement.scale === 'number'
        ? placement.scale
        : typeof legacy.scaleX === 'number'
          ? legacy.scaleX
          : typeof legacy.scale === 'number'
            ? legacy.scale
            : 1
  const scaleY =
    typeof placement.scaleY === 'number'
      ? placement.scaleY
      : typeof placement.scale === 'number'
        ? placement.scale
        : typeof legacy.scaleY === 'number'
          ? legacy.scaleY
          : typeof legacy.scale === 'number'
            ? legacy.scale
            : 1

  return { x, y, scale: typeof placement.scale === 'number' ? placement.scale : undefined, scaleX, scaleY }
}
