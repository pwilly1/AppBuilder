// © 2025 Preston Willis. All rights reserved.
// Schema-first -> render adapter
import type { Block } from '../shared/schema/types';
import type { BlockType } from '../shared/schema/types';
import type { ReactElement } from 'react';
import { Hero } from './blocks/Hero';
import { TextBlock } from './blocks/TextBlock';
import { NavButton } from './blocks/NavButton';
import { ServicesList } from './blocks/ServicesList';
import { ContactForm } from './blocks/ContactForm';
import { ImageGallery } from './blocks/ImageGallery';

const registry: Record<BlockType, (p: any) => ReactElement | null> = {
  hero: Hero,
  text: TextBlock,
  navButton: NavButton,
  servicesList: ServicesList,
  contactForm: ContactForm,
  imageGallery: ImageGallery,
};

export function BlockRenderer({
  block,
  onNavigate,
  projectId,
  previewMode,
}: {
  block: Block;
  onNavigate?: (pageId: string) => void;
  projectId?: string;
  previewMode?: boolean;
}) {
  const Cmp = registry[block.type];
  return Cmp ? <Cmp {...block.props} blockId={block.id} projectId={projectId} previewMode={previewMode} onNavigate={onNavigate} /> : null;
}
