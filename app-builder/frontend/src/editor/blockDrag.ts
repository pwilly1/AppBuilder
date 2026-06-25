import type { Block } from '../shared/schema/types'

export const BLOCK_DRAG_DATA_TYPE = 'application/x-apptura-block'
export const BLOCK_DRAG_FALLBACK_TYPE = 'text/plain'

let activeDraggedBlock: Block | null = null

export function setActiveDraggedBlock(block: Block) {
  activeDraggedBlock = block
}

export function clearActiveDraggedBlock() {
  activeDraggedBlock = null
}

export function getActiveDraggedBlock(): Block | null {
  return activeDraggedBlock
}

export function encodeDraggedBlock(block: Block): string {
  return JSON.stringify(block)
}

export function decodeDraggedBlock(raw: string | null): Block | null {
  if (!raw) return null

  try {
    return JSON.parse(raw) as Block
  } catch {
    return null
  }
}

export function getDraggedBlockFromDataTransfer(dataTransfer: DataTransfer): Block | null {
  return decodeDraggedBlock(dataTransfer.getData(BLOCK_DRAG_DATA_TYPE)) ?? getActiveDraggedBlock()
}
