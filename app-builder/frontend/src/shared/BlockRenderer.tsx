// © 2025 Preston Willis. All rights reserved.
// Schema-first -> render adapter
import type { Block } from '../shared/schema/types';
import type { BlockType } from '../shared/schema/types';
import type { ReactElement } from 'react';
import { Hero } from './blocks/Hero';
import { TextBlock } from './blocks/TextBlock';
import { NavButton } from './blocks/NavButton';

const registry: Record<BlockType, (p: any) => ReactElement | null> = {
  hero: Hero,
  text: TextBlock,
  navButton: NavButton,
};

export function BlockRenderer({ block, onNavigate }: { block: Block; onNavigate?: (pageId: string) => void }) {
  const Cmp = registry[block.type];
  return Cmp ? <Cmp {...block.props} onNavigate={onNavigate} /> : null;
}
