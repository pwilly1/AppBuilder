import { BlockRegistry } from './registry'
import type {
  Block,
  BlockEditorPlacement,
  BlockLayoutClass,
  LayoutAlign,
  LayoutSpacing,
  LayoutWidth,
  Page,
  PageSection,
  SectionKind,
  SectionSlot,
  SectionSlotKind,
} from './types'

const DEFAULT_SECTION_LAYOUT = {
  gap: 'md' as LayoutSpacing,
  paddingTop: 'md' as LayoutSpacing,
  paddingBottom: 'md' as LayoutSpacing,
  paddingHorizontal: 'md' as LayoutSpacing,
  contentWidth: 'contained' as const,
  align: 'center' as LayoutAlign,
}

function preferredSectionKind(block: Block): SectionKind {
  const registryEntry = BlockRegistry[block.type]
  return registryEntry?.recommendedSections?.[0] ?? 'stack'
}

function defaultSlotKindForBlock(block: Block): SectionSlotKind {
  switch (block.layout?.layoutClass ?? BlockRegistry[block.type]?.layoutClass) {
    case 'hero':
    case 'list':
    case 'media':
    case 'form':
      return 'full'
    case 'action':
      return 'action-row'
    default:
      return 'content'
  }
}

function acceptedLayoutClasses(sectionKind: SectionKind, slotKind: SectionSlotKind): BlockLayoutClass[] {
  if (sectionKind === 'hero') return ['hero', 'content', 'action']
  if (sectionKind === 'form') return slotKind === 'action-row' ? ['action'] : ['form', 'content', 'action']
  if (sectionKind === 'gallery') return ['media', 'content', 'action']
  if (sectionKind === 'grid') return ['content', 'action', 'media', 'list']
  if (sectionKind === 'split') {
    if (slotKind === 'left' || slotKind === 'right') return ['content', 'media', 'list', 'action', 'form']
  }
  return slotKind === 'action-row' ? ['action'] : ['content', 'action', 'list', 'media', 'form', 'hero']
}

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

export function deriveRuntimeSections(page: Page): PageSection[] {
  if (page.sections?.length) return page.sections

  return page.blocks.map((block, index) => {
    const sectionId = block.layout?.sectionId ?? `section-${block.id}`
    const sectionKind = preferredSectionKind(block)
    const slotKind = block.layout?.slotId ? inferSlotKindFromId(block.layout.slotId) : defaultSlotKindForBlock(block)
    const slotId = block.layout?.slotId ?? `${sectionId}-${slotKind}`
    return {
      id: sectionId,
      kind: sectionKind,
      title: `${BlockRegistry[block.type]?.displayName ?? block.type} Section`,
      layout: {
        ...DEFAULT_SECTION_LAYOUT,
        columns: sectionKind === 'grid' ? 2 : sectionKind === 'split' ? 2 : 1,
        contentWidth: sectionKind === 'hero' ? 'full' : sectionKind === 'stack' ? 'contained' : 'contained',
        align: (block.layout?.align ?? DEFAULT_SECTION_LAYOUT.align) as LayoutAlign,
      },
      slots: [
        {
          id: slotId,
          kind: slotKind,
          accepts: acceptedLayoutClasses(sectionKind, slotKind),
          blockIds: [block.id],
        },
      ],
    } satisfies PageSection
  })
}

function inferSlotKindFromId(slotId: string): SectionSlotKind {
  if (slotId.endsWith('-left')) return 'left'
  if (slotId.endsWith('-right')) return 'right'
  if (slotId.endsWith('-grid-cell')) return 'grid-cell'
  if (slotId.endsWith('-action-row')) return 'action-row'
  if (slotId.endsWith('-content')) return 'content'
  return 'full'
}

export function layoutSummaryForBlock(block: Block): {
  width: LayoutWidth
  align: LayoutAlign
  layoutClass: BlockLayoutClass
} {
  const registryEntry = BlockRegistry[block.type]
  return {
    width: block.layout?.width ?? registryEntry?.defaultLayout?.width ?? 'content',
    align: block.layout?.align ?? registryEntry?.defaultLayout?.align ?? 'center',
    layoutClass: block.layout?.layoutClass ?? registryEntry?.layoutClass ?? 'content',
  }
}

export function findSectionForBlock(sections: PageSection[], blockId: string): PageSection | undefined {
  return sections.find((section) => section.slots.some((slot) => slot.blockIds.includes(blockId)))
}

export function findSlotForBlock(section: PageSection | undefined, blockId: string): SectionSlot | undefined {
  return section?.slots.find((slot) => slot.blockIds.includes(blockId))
}
