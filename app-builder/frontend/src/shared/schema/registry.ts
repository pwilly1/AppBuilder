// Copyright 2025 Preston Willis. All rights reserved.
// Block registry with defaults and factories (no React imports)
import type {
  BlockType,
  Block,
  BlockLayoutClass,
  BlockGridConstraints,
  BlockRenderMetadata,
  BlockRuntimeLayout,
} from './types'

export type BlockRegistryEntry = {
  displayName: string
  defaultProps: Record<string, any>
  layoutClass: BlockLayoutClass
  defaultLayout: Partial<BlockRuntimeLayout>
  gridConstraints: BlockGridConstraints
  defaultRender: Partial<BlockRenderMetadata>
}

export const BlockRegistry: Record<BlockType, BlockRegistryEntry> = {
  container: {
    displayName: 'Container',
    layoutClass: 'container',
    defaultLayout: { width: 'full', align: 'start', spacingTop: 'none', spacingBottom: 'none' },
    gridConstraints: {
      defaultSpan: { cols: 12, rows: 8 },
      minSpan: { cols: 1, rows: 1 },
      maxSpan: { cols: 16, rows: 29 },
      allowInnerMove: false,
    },
    defaultRender: { alignX: 'center', alignY: 'center' },
    defaultProps: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      borderWidth: 0,
      borderRadius: 0,
      opacity: 1,
    },
  },
  hero: {
    displayName: 'Hero',
    layoutClass: 'hero',
    defaultLayout: { width: 'full', align: 'center', spacingTop: 'lg', spacingBottom: 'md' },
    gridConstraints: {
      defaultSpan: { cols: 16, rows: 6 },
      minSpan: { cols: 1, rows: 1 },
      maxSpan: { cols: 16, rows: 48 },
      allowInnerMove: true,
    },
    defaultRender: { alignX: 'center', alignY: 'center' },
    defaultProps: { headline: 'Headline', headlineSize: 28 },
  },
  text: {
    displayName: 'Text',
    layoutClass: 'content',
    defaultLayout: { width: 'content', align: 'center', spacingTop: 'sm', spacingBottom: 'sm' },
    gridConstraints: {
      defaultSpan: { cols: 8, rows: 4 },
      minSpan: { cols: 1, rows: 1 },
      maxSpan: { cols: 16, rows: 48 },
      allowAutoGrowRows: true,
      allowInnerMove: true,
    },
    defaultRender: { alignX: 'center', alignY: 'center' },
    defaultProps: { value: 'Text', fontSize: 16 },
  },
  navButton: {
    displayName: 'Nav Button',
    layoutClass: 'action',
    defaultLayout: { width: 'content', align: 'center', spacingTop: 'xs', spacingBottom: 'sm' },
    gridConstraints: {
      defaultSpan: { cols: 4, rows: 2 },
      minSpan: { cols: 1, rows: 1 },
      maxSpan: { cols: 16, rows: 48 },
      allowInnerMove: true,
    },
    defaultRender: { alignX: 'center', alignY: 'center' },
    defaultProps: {
      label: 'Go',
      toPageId: '',
      fontSize: 14,
      contentPadding: 12,
      buttonPaddingX: 14,
      buttonPaddingY: 10,
      borderRadius: 10,
      backgroundColor: '#0f172a',
      textColor: '#ffffff',
    },
  },
  shape: {
    displayName: 'Shape',
    layoutClass: 'shape',
    defaultLayout: { width: 'content', align: 'center', spacingTop: 'sm', spacingBottom: 'sm' },
    gridConstraints: {
      defaultSpan: { cols: 6, rows: 4 },
      minSpan: { cols: 1, rows: 1 },
      maxSpan: { cols: 16, rows: 48 },
      allowInnerMove: true,
    },
    defaultRender: { alignX: 'center', alignY: 'center' },
    defaultProps: {
      shapeType: 'rectangle',
      fillColor: '#dbeafe',
      borderColor: '#2563eb',
      borderWidth: 0,
      borderRadius: 18,
      opacity: 1,
    },
  },
  badge: {
    displayName: 'Badge',
    layoutClass: 'badge',
    defaultLayout: { width: 'content', align: 'center', spacingTop: 'xs', spacingBottom: 'xs' },
    gridConstraints: {
      defaultSpan: { cols: 4, rows: 2 },
      minSpan: { cols: 1, rows: 1 },
      maxSpan: { cols: 16, rows: 8 },
      allowInnerMove: true,
    },
    defaultRender: { alignX: 'center', alignY: 'center' },
    defaultProps: {
      text: 'Badge',
      fontSize: 13,
      backgroundColor: '#dbeafe',
      textColor: '#1d4ed8',
      borderColor: '#bfdbfe',
      borderRadius: 999,
      paddingX: 12,
      paddingY: 6,
    },
  },
  icon: {
    displayName: 'Icon',
    layoutClass: 'icon',
    defaultLayout: { width: 'content', align: 'center', spacingTop: 'xs', spacingBottom: 'xs' },
    gridConstraints: {
      defaultSpan: { cols: 2, rows: 2 },
      minSpan: { cols: 1, rows: 1 },
      maxSpan: { cols: 8, rows: 8 },
      allowInnerMove: true,
    },
    defaultRender: { alignX: 'center', alignY: 'center' },
    defaultProps: {
      iconName: 'star',
      fontSize: 28,
      color: '#2563eb',
      backgroundColor: '#ffffff',
      borderRadius: 999,
    },
  },
  checkbox: {
    displayName: 'Checkbox',
    layoutClass: 'control',
    defaultLayout: { width: 'content', align: 'center', spacingTop: 'xs', spacingBottom: 'xs' },
    gridConstraints: {
      defaultSpan: { cols: 6, rows: 2 },
      minSpan: { cols: 2, rows: 1 },
      maxSpan: { cols: 16, rows: 8 },
      allowInnerMove: true,
    },
    defaultRender: { alignX: 'center', alignY: 'center' },
    defaultProps: {
      label: 'Checkbox',
      checked: true,
      fontSize: 14,
      textColor: '#0f172a',
      boxColor: '#2563eb',
      checkColor: '#ffffff',
      borderColor: '#94a3b8',
    },
  },
  toggle: {
    displayName: 'Toggle',
    layoutClass: 'control',
    defaultLayout: { width: 'content', align: 'center', spacingTop: 'xs', spacingBottom: 'xs' },
    gridConstraints: {
      defaultSpan: { cols: 6, rows: 2 },
      minSpan: { cols: 2, rows: 1 },
      maxSpan: { cols: 16, rows: 8 },
      allowInnerMove: true,
    },
    defaultRender: { alignX: 'center', alignY: 'center' },
    defaultProps: {
      label: 'Toggle',
      checked: true,
      fontSize: 14,
      textColor: '#0f172a',
      activeColor: '#2563eb',
      inactiveColor: '#cbd5e1',
      knobColor: '#ffffff',
    },
  },
  progressBar: {
    displayName: 'Progress Bar',
    layoutClass: 'status',
    defaultLayout: { width: 'content', align: 'center', spacingTop: 'xs', spacingBottom: 'xs' },
    gridConstraints: {
      defaultSpan: { cols: 8, rows: 2 },
      minSpan: { cols: 2, rows: 1 },
      maxSpan: { cols: 16, rows: 8 },
      allowInnerMove: true,
    },
    defaultRender: { alignX: 'center', alignY: 'center' },
    defaultProps: {
      label: 'Progress',
      value: 65,
      showLabel: true,
      trackColor: '#e2e8f0',
      fillColor: '#2563eb',
      textColor: '#475569',
      borderRadius: 999,
    },
  },
  input: {
    displayName: 'Input',
    layoutClass: 'input',
    defaultLayout: { width: 'content', align: 'center', spacingTop: 'sm', spacingBottom: 'sm' },
    gridConstraints: {
      defaultSpan: { cols: 8, rows: 3 },
      minSpan: { cols: 2, rows: 2 },
      maxSpan: { cols: 16, rows: 8 },
      allowInnerMove: true,
    },
    defaultRender: { alignX: 'center', alignY: 'center' },
    defaultProps: {
      label: 'Label',
      placeholder: 'Placeholder',
      value: '',
      inputType: 'text',
      fontSize: 14,
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      placeholderColor: '#94a3b8',
      borderColor: '#cbd5e1',
      borderRadius: 12,
    },
  },
  textarea: {
    displayName: 'Textarea',
    layoutClass: 'input',
    defaultLayout: { width: 'content', align: 'center', spacingTop: 'sm', spacingBottom: 'sm' },
    gridConstraints: {
      defaultSpan: { cols: 8, rows: 4 },
      minSpan: { cols: 3, rows: 3 },
      maxSpan: { cols: 16, rows: 12 },
      allowInnerMove: true,
    },
    defaultRender: { alignX: 'center', alignY: 'center' },
    defaultProps: {
      label: 'Message',
      placeholder: 'Write something...',
      value: '',
      rows: 3,
      fontSize: 14,
      backgroundColor: '#ffffff',
      textColor: '#0f172a',
      placeholderColor: '#94a3b8',
      borderColor: '#cbd5e1',
      borderRadius: 12,
    },
  },
  image: {
    displayName: 'Image',
    layoutClass: 'media',
    defaultLayout: { width: 'content', align: 'center', spacingTop: 'sm', spacingBottom: 'sm' },
    gridConstraints: {
      defaultSpan: { cols: 8, rows: 6 },
      minSpan: { cols: 1, rows: 1 },
      maxSpan: { cols: 16, rows: 29 },
      allowInnerMove: true,
    },
    defaultRender: { alignX: 'center', alignY: 'center' },
    defaultProps: {
      src: '',
      alt: 'Image',
      fit: 'cover',
      positionX: 50,
      positionY: 50,
      backgroundColor: '#e2e8f0',
      borderColor: 'transparent',
      borderWidth: 0,
      borderRadius: 16,
      opacity: 1,
    },
  },
  servicesList: {
    displayName: 'Services List',
    layoutClass: 'list',
    defaultLayout: { width: 'full', align: 'start', spacingTop: 'md', spacingBottom: 'md' },
    gridConstraints: {
      defaultSpan: { cols: 16, rows: 6 },
      minSpan: { cols: 8, rows: 4 },
      maxSpan: { cols: 16, rows: 12 },
      allowAutoGrowRows: true,
      allowInnerMove: true,
    },
    defaultRender: { alignX: 'center', alignY: 'center' },
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
      defaultSpan: { cols: 16, rows: 8 },
      minSpan: { cols: 12, rows: 6 },
      maxSpan: { cols: 16, rows: 16 },
      allowAutoGrowRows: true,
      allowInnerMove: true,
    },
    defaultRender: { alignX: 'center', alignY: 'center' },
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
      defaultSpan: { cols: 16, rows: 6 },
      minSpan: { cols: 8, rows: 4 },
      maxSpan: { cols: 16, rows: 12 },
      allowInnerMove: true,
    },
    defaultRender: { alignX: 'center', alignY: 'center' },
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

export function isSupportedBlockType(value: unknown): value is BlockType {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(BlockRegistry, value)
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
