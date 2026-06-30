export type {
  AppTemplateDefinition,
  PageTemplateDefinition,
  SectionTemplateDefinition,
  TemplateBlockDefinition,
  TemplateCategory,
  TemplateDefinition,
  TemplatePageDefinition,
  TemplateSectionPlacement,
} from './templates/templateTypes'

export { SECTION_TEMPLATE_DEFINITIONS } from './templates/templateSections'
export { PAGE_TEMPLATE_DEFINITIONS } from './templates/templatePages'
export { APP_TEMPLATE_DEFINITIONS } from './templates/templateApps'
export {
  TEMPLATE_DEFINITIONS,
  getSectionTemplate,
  instantiateSectionTemplate,
  instantiateTemplate,
  instantiateTemplatePage,
  isAppTemplate,
  isPageTemplate,
  isSectionTemplate,
} from './templates/templateFactory'
