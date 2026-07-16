import { createBlock } from '../registry'
import type { Block, GridPlacement, Page } from '../types'
import { APP_TEMPLATE_DEFINITIONS } from './templateApps'
import { PAGE_TEMPLATE_DEFINITIONS } from './templatePages'
import { SECTION_TEMPLATE_DEFINITIONS } from './templateSections'
import type {
  AppTemplateDefinition,
  PageTemplateDefinition,
  SectionTemplateDefinition,
  TemplateDefinition,
  TemplatePageDefinition,
} from './templateTypes'

export const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  ...SECTION_TEMPLATE_DEFINITIONS,
  ...PAGE_TEMPLATE_DEFINITIONS,
  ...APP_TEMPLATE_DEFINITIONS,
]

export function isSectionTemplate(template: TemplateDefinition): template is SectionTemplateDefinition {
  return template.category === 'section'
}

export function isPageTemplate(template: TemplateDefinition): template is PageTemplateDefinition {
  return template.category === 'page'
}

export function isAppTemplate(template: TemplateDefinition): template is AppTemplateDefinition {
  return template.category === 'app'
}

export function getSectionTemplate(sectionId: string): SectionTemplateDefinition {
  const section = SECTION_TEMPLATE_DEFINITIONS.find((template) => template.id === sectionId)
  if (!section) throw new Error(`Unknown section template: ${sectionId}`)
  return section
}

export function instantiateSectionTemplate(
  template: SectionTemplateDefinition,
  placement: GridPlacement,
  options: {
    blockProps?: Record<string, Record<string, any>>
    pageIdByKey?: Map<string, string>
  } = {},
): Block[] {
  const idByKey = new Map<string, string>()
  const submitFieldsByGroupKey = new Map<string, Array<{ fieldBlockId: string }>>()

  for (const block of template.blocks) {
    idByKey.set(block.key, crypto.randomUUID())
  }

  for (const block of template.blocks) {
    const submitGroupKey = typeof block.props?.submitGroupKey === 'string' ? block.props.submitGroupKey : ''
    if (!submitGroupKey || !isSubmissionFieldType(block.type)) continue
    const fieldBlockId = idByKey.get(block.key)
    if (!fieldBlockId) continue
    submitFieldsByGroupKey.set(submitGroupKey, [
      ...(submitFieldsByGroupKey.get(submitGroupKey) || []),
      { fieldBlockId },
    ])
  }

  return template.blocks.map((definition) => {
    const overrideProps = options.blockProps?.[definition.key] ?? {}
    const base = createBlock(
      definition.type,
      resolveTemplateProps(
        definition.type,
        { ...(definition.props || {}), ...overrideProps },
        options.pageIdByKey,
        submitFieldsByGroupKey,
      ),
    )
    const id = idByKey.get(definition.key) ?? crypto.randomUUID()
    const parentId = definition.parentKey ? idByKey.get(definition.parentKey) : undefined
    const grid = definition.parentKey
      ? definition.grid
      : {
          ...definition.grid,
          colStart: placement.colStart,
          rowStart: placement.rowStart,
          colSpan: placement.colSpan,
          rowSpan: placement.rowSpan,
        }

    return {
      ...base,
      id,
      parentId,
      layout: {
        ...(base.layout || {}),
        grid,
      },
      render: {
        ...(base.render || {}),
        ...(definition.render || {}),
      },
    }
  })
}

export function instantiateTemplatePage(
  pageDefinition: TemplatePageDefinition,
  pageId: string,
  path: string,
  pageIdByKey: Map<string, string>,
): Page {
  const blocks = pageDefinition.sections.flatMap((placement) => {
    const sectionTemplate = getSectionTemplate(placement.sectionId)
    return instantiateSectionTemplate(sectionTemplate, placement.grid, {
      blockProps: placement.blockProps,
      pageIdByKey,
    })
  })

  return {
    id: pageId,
    title: pageDefinition.title,
    path,
    blocks,
  }
}

export function instantiateTemplate(template: SectionTemplateDefinition, placement: GridPlacement): Block[] {
  return instantiateSectionTemplate(template, placement)
}

function resolveTemplateProps(
  blockType: Block['type'],
  props: Record<string, any>,
  pageIdByKey?: Map<string, string>,
  submitFieldsByGroupKey?: Map<string, Array<{ fieldBlockId: string }>>,
) {
  const next = { ...props }
  const toPageKey = typeof next.toPageKey === 'string' ? next.toPageKey : null
  if (toPageKey && pageIdByKey?.has(toPageKey)) {
    next.toPageId = pageIdByKey.get(toPageKey)
    next.action = { type: 'navigate', targetPageId: next.toPageId }
  } else if (typeof next.toPageId === 'string') {
    next.action = { type: 'navigate', targetPageId: next.toPageId }
  }
  const submitGroupKey = typeof next.submitGroupKey === 'string' ? next.submitGroupKey : null
  if (blockType === 'button' && submitGroupKey) {
    next.action = {
      type: 'submitData',
      fields: submitFieldsByGroupKey?.get(submitGroupKey) || [],
      ...(typeof next.collectionId === 'string' && next.collectionId.trim() ? { collectionId: next.collectionId.trim() } : {}),
    }
  }
  delete next.toPageKey
  delete next.submitGroupKey
  delete next.submitGroupId
  delete next.collectionId
  return next
}

function isSubmissionFieldType(type: Block['type']) {
  return type === 'input' || type === 'textarea' || type === 'checkbox' || type === 'toggle'
}
