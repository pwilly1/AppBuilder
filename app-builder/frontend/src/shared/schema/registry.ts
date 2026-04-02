// © 2025 Preston Willis. All rights reserved.
// Block registry with defaults and factories (no React imports)
import type {
  BlockType,
  Block,
  BlockLayoutClass,
  BlockGridConstraints,
  BlockRenderMetadata,
  BlockRuntimeLayout,
  SectionKind,
} from './types'

export type BlockRegistryEntry = {
  displayName: string
  defaultProps: Record<string, any>
  layoutClass: BlockLayoutClass
  defaultLayout: Partial<BlockRuntimeLayout>
  gridConstraints: BlockGridConstraints
  defaultRender: Partial<BlockRenderMetadata>
  recommendedSections: SectionKind[]
}

export const BlockRegistry: Record<BlockType, BlockRegistryEntry> = {
  hero: {
    displayName: 'Hero',
    layoutClass: 'hero',
    defaultLayout: { width: 'full', align: 'center', spacingTop: 'lg', spacingBottom: 'md' },
    gridConstraints: {
      defaultSpan: { cols: 8, rows: 3 },
      minSpan: { cols: 8, rows: 2 },
      maxSpan: { cols: 8, rows: 5 },
      allowInnerMove: true,
    },
    defaultRender: { alignX: 'center', alignY: 'center' },
    recommendedSections: ['hero', 'stack'],
    defaultProps: { headline: 'Headline', subhead: '' },
  },
  text: {
    displayName: 'Text',
    layoutClass: 'content',
    defaultLayout: { width: 'content', align: 'center', spacingTop: 'sm', spacingBottom: 'sm' },
    gridConstraints: {
      defaultSpan: { cols: 4, rows: 2 },
      minSpan: { cols: 2, rows: 1 },
      maxSpan: { cols: 8, rows: 6 },
      allowAutoGrowRows: true,
      allowInnerMove: true,
    },
    defaultRender: { alignX: 'center', alignY: 'center' },
    recommendedSections: ['stack', 'split'],
    defaultProps: { value: 'Text', fontSize: 16 },
  },
  navButton: {
    displayName: 'Nav Button',
    layoutClass: 'action',
    defaultLayout: { width: 'content', align: 'center', spacingTop: 'xs', spacingBottom: 'sm' },
    gridConstraints: {
      defaultSpan: { cols: 2, rows: 1 },
      minSpan: { cols: 1, rows: 1 },
      maxSpan: { cols: 4, rows: 1 },
      allowInnerMove: true,
    },
    defaultRender: { alignX: 'center', alignY: 'center' },
    recommendedSections: ['stack', 'split'],
    defaultProps: { label: 'Go', toPageId: '' },
  },
  servicesList: {
    displayName: 'Services List',
    layoutClass: 'list',
    defaultLayout: { width: 'full', align: 'start', spacingTop: 'md', spacingBottom: 'md' },
    gridConstraints: {
      defaultSpan: { cols: 8, rows: 3 },
      minSpan: { cols: 4, rows: 2 },
      maxSpan: { cols: 8, rows: 6 },
      allowAutoGrowRows: true,
      allowInnerMove: true,
    },
    defaultRender: { alignX: 'center', alignY: 'center' },
    recommendedSections: ['stack', 'split'],
    defaultProps: {
      title: 'Services',
      items: [
        { name: 'Signature Cut', description: 'Precision cut and style tailored to you.', price: '$45' },
        { name: 'Color Refresh', description: 'Single-process color with gloss finish.', price: '$85' },
        { name: 'Blowout', description: 'Smooth finish with volume and shine.', price: '$35' },
      ],
    },
  },
  contactForm: {
    displayName: 'Contact Form',
    layoutClass: 'form',
    defaultLayout: { width: 'full', align: 'start', spacingTop: 'md', spacingBottom: 'lg' },
    gridConstraints: {
      defaultSpan: { cols: 8, rows: 4 },
      minSpan: { cols: 6, rows: 3 },
      maxSpan: { cols: 8, rows: 8 },
      allowAutoGrowRows: true,
      allowInnerMove: true,
    },
    defaultRender: { alignX: 'center', alignY: 'center' },
    recommendedSections: ['form', 'stack'],
    defaultProps: {
      title: 'Get in Touch',
      subtitle: 'Tell us what you need and we will follow up shortly.',
      destinationEmail: '',
      submitLabel: 'Send Message',
      successMessage: 'Thanks, we received your message.',
      showName: true,
      showEmail: true,
      showPhone: true,
      showMessage: true,
    },
  },
  imageGallery: {
    displayName: 'Image Gallery',
    layoutClass: 'media',
    defaultLayout: { width: 'full', align: 'center', spacingTop: 'md', spacingBottom: 'md' },
    gridConstraints: {
      defaultSpan: { cols: 8, rows: 3 },
      minSpan: { cols: 4, rows: 2 },
      maxSpan: { cols: 8, rows: 6 },
      allowInnerMove: true,
    },
    defaultRender: { alignX: 'center', alignY: 'center' },
    recommendedSections: ['gallery', 'grid', 'stack'],
    defaultProps: {
      title: 'Gallery',
      columns: 2,
      images: [
        { url: '', caption: 'Featured work' },
        { url: '', caption: 'Client favorite' },
        { url: '', caption: 'Behind the scenes' },
        { url: '', caption: 'Team highlight' },
      ],
    },
  },
}

export function createBlock<T extends BlockType = BlockType>(type: T, overrides: Record<string, any> = {}): Block {
  const def = BlockRegistry[type]
  const props = { ...(def?.defaultProps || {}), ...(overrides || {}) }
  return {
    id: crypto.randomUUID(),
    type,
    props,
    layout: {
      layoutClass: def.layoutClass,
      ...(def.defaultLayout || {}),
    },
    render: {
      alignX: 'center',
      alignY: 'center',
      ...(def.defaultRender || {}),
    },
  }
}
