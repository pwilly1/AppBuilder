import type { Block, GridSpan } from './types'

export const REPEATER_MIN_LIMIT = 1
export const REPEATER_MAX_LIMIT = 20
export const REPEATER_DEFAULT_LIMIT = 10
export const REPEATER_DEFAULT_ITEM_ROW_SPAN = 4
export const REPEATER_MAX_ITEM_ROW_SPAN = 29
export const REPEATER_DEFAULT_GAP_ROWS = 1

export type RepeaterRecordScope = 'all' | 'currentUser'
export type RepeaterRecordOrder = 'newest' | 'oldest'

export type RepeaterProps = {
  collectionId: string
  scope: RepeaterRecordScope
  order: RepeaterRecordOrder
  limit: number
  itemRowSpan: number
  gapRows: number
  emptyText: string
  backgroundColor: string
  borderColor: string
  borderWidth: number
  borderRadius: number
  opacity: number
}

export const DEFAULT_REPEATER_PROPS: RepeaterProps = {
  collectionId: '',
  scope: 'all',
  order: 'newest',
  limit: REPEATER_DEFAULT_LIMIT,
  itemRowSpan: REPEATER_DEFAULT_ITEM_ROW_SPAN,
  gapRows: REPEATER_DEFAULT_GAP_ROWS,
  emptyText: 'No records yet',
  backgroundColor: 'transparent',
  borderColor: 'transparent',
  borderWidth: 0,
  borderRadius: 0,
  opacity: 1,
}

export function isRepeaterBlock(block: Block | null | undefined): boolean {
  return block?.type === 'repeater'
}

export function normalizeRepeaterProps(value: unknown): RepeaterProps {
  const props = isRecord(value) ? value : {}
  return {
    collectionId: readString(props.collectionId),
    scope: props.scope === 'currentUser' ? 'currentUser' : 'all',
    order: props.order === 'oldest' ? 'oldest' : 'newest',
    limit: clampInteger(props.limit, REPEATER_MIN_LIMIT, REPEATER_MAX_LIMIT, REPEATER_DEFAULT_LIMIT),
    itemRowSpan: clampInteger(
      props.itemRowSpan,
      1,
      REPEATER_MAX_ITEM_ROW_SPAN,
      REPEATER_DEFAULT_ITEM_ROW_SPAN,
    ),
    gapRows: clampInteger(props.gapRows, 0, REPEATER_MAX_ITEM_ROW_SPAN, REPEATER_DEFAULT_GAP_ROWS),
    emptyText: readString(props.emptyText) || DEFAULT_REPEATER_PROPS.emptyText,
    backgroundColor: readString(props.backgroundColor) || DEFAULT_REPEATER_PROPS.backgroundColor,
    borderColor: readString(props.borderColor) || DEFAULT_REPEATER_PROPS.borderColor,
    borderWidth: clampNumber(props.borderWidth, 0, 32, DEFAULT_REPEATER_PROPS.borderWidth),
    borderRadius: clampNumber(props.borderRadius, 0, 999, DEFAULT_REPEATER_PROPS.borderRadius),
    opacity: clampNumber(props.opacity, 0, 1, DEFAULT_REPEATER_PROPS.opacity),
  }
}

export function normalizeRepeaterBlock(block: Block): Block {
  if (!isRepeaterBlock(block)) return block
  return {
    ...block,
    props: {
      ...(block.props as Record<string, unknown>),
      ...normalizeRepeaterProps(block.props),
    },
  }
}

export function getRepeaterItemSpan(block: Block): GridSpan {
  const props = normalizeRepeaterProps(block.props)
  return {
    cols: Math.max(1, block.layout?.grid?.colSpan ?? 1),
    rows: props.itemRowSpan,
  }
}

export function getRepeaterRuntimeInstanceId(
  repeaterId: string,
  recordId: string,
  templateBlockId: string,
): string {
  return `${repeaterId}:${recordId}:${templateBlockId}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.floor(parsed)))
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}
