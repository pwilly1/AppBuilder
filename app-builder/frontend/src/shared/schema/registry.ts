// © 2025 Preston Willis. All rights reserved.
// Block registry with defaults and factories (no React imports)
import type { BlockType, Block } from './types'

export const BlockRegistry: Record<BlockType, { displayName: string; defaultProps: Record<string, any> }> = {
  hero: {
    displayName: 'Hero',
    defaultProps: { headline: 'Headline', subhead: '' },
  },
  text: {
    displayName: 'Text',
    defaultProps: { value: 'Text', fontSize: 16 },
  },
  navButton: {
    displayName: 'Nav Button',
    defaultProps: { label: 'Go', toPageId: '' },
  },
  servicesList: {
    displayName: 'Services List',
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
  return { id: crypto.randomUUID(), type, props }
}
