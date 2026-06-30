import type { Block, BlockType, GridPlacement, GridSpan } from '../types'

export type TemplateCategory = 'section' | 'page' | 'app'

export type TemplateBlockDefinition = {
  key: string
  parentKey?: string
  type: BlockType
  props?: Record<string, any>
  grid: GridPlacement
  render?: Block['render']
}

type TemplateBase = {
  id: string
  name: string
  description: string
  category: TemplateCategory
  preview: string
}

export type SectionTemplateDefinition = TemplateBase & {
  category: 'section'
  bounds: GridSpan
  blocks: TemplateBlockDefinition[]
}

export type TemplateSectionPlacement = {
  sectionId: string
  grid: GridPlacement
  blockProps?: Record<string, Record<string, any>>
}

export type TemplatePageDefinition = {
  key: string
  title: string
  pathBase?: string
  sections: TemplateSectionPlacement[]
}

export type PageTemplateDefinition = TemplateBase & {
  category: 'page'
  pages: TemplatePageDefinition[]
}

export type AppTemplateDefinition = TemplateBase & {
  category: 'app'
  pages: TemplatePageDefinition[]
}

export type TemplateDefinition = SectionTemplateDefinition | PageTemplateDefinition | AppTemplateDefinition
