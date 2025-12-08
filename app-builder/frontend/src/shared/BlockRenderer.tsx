// © 2025 Preston Willis. All rights reserved.
// Schema-first -> render adapter
import type { Block } from '../shared/schema/types';
import type { ReactElement } from 'react';
import { Hero } from './blocks/Hero';
import { TextBlock } from './blocks/TextBlock';

const registry: Record<string, (p: any) => ReactElement | null> = {
  hero: Hero,
  text: TextBlock,
  // image: ImageBlock, etc.
};

export function BlockRenderer({ block }: { block: Block }) {
  const Cmp = registry[block.type];
  return Cmp ? <Cmp {...block.props} /> : null;
}
