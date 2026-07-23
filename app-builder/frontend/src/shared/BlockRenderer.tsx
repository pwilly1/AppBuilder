// © 2025 Preston Willis. All rights reserved.
// Schema-first -> render adapter
import type { Block } from '../shared/schema/types';
import type { BlockType } from '../shared/schema/types';
import type { ReactElement, ReactNode } from 'react';
import { Hero } from './blocks/Hero';
import { TextBlock } from './blocks/TextBlock';
import { ButtonBlock } from './blocks/ButtonBlock';
import { ShapeBlock } from './blocks/ShapeBlock';
import { BadgeBlock } from './blocks/BadgeBlock';
import { IconBlock } from './blocks/IconBlock';
import { CheckboxBlock } from './blocks/CheckboxBlock';
import { ToggleBlock } from './blocks/ToggleBlock';
import { ProgressBarBlock } from './blocks/ProgressBarBlock';
import { InputBlock } from './blocks/InputBlock';
import { TextareaBlock } from './blocks/TextareaBlock';
import { ImageBlock } from './blocks/ImageBlock';
import { ServicesList } from './blocks/ServicesList';
import { ContactForm } from './blocks/ContactForm';
import { ImageGallery } from './blocks/ImageGallery';
import { ContainerBlock } from './blocks/ContainerBlock';
import { FormBlock } from './blocks/FormBlock';
import { getBlockContentScale } from './schema/contentScale';
import { resolveBlockAction } from './actions/blockActions';
import { resolveBlockProps, type RuntimeContext } from './runtime/runtimeBindings';

const registry: Record<BlockType, (p: any) => ReactElement | null> = {
  container: ContainerBlock,
  form: FormBlock,
  hero: Hero,
  text: TextBlock,
  button: ButtonBlock,
  shape: ShapeBlock,
  badge: BadgeBlock,
  icon: IconBlock,
  checkbox: CheckboxBlock,
  toggle: ToggleBlock,
  progressBar: ProgressBarBlock,
  input: InputBlock,
  textarea: TextareaBlock,
  image: ImageBlock,
  servicesList: ServicesList,
  contactForm: ContactForm,
  imageGallery: ImageGallery,
};

export function BlockRenderer({
  block,
  onNavigate,
  projectId,
  previewMode,
  runtimeContext,
  onSetPageState,
  children,
}: {
  block: Block;
  onNavigate?: (pageId: string) => void;
  projectId?: string;
  previewMode?: boolean;
  runtimeContext?: RuntimeContext;
  onSetPageState?: (variableId: string, value: string) => void;
  children?: ReactNode;
}) {
  const Cmp = registry[block.type];
  const contentScale = getBlockContentScale(block);
  const action = resolveBlockAction(block);
  const resolvedProps = resolveBlockProps(block, runtimeContext);
  return Cmp ? <Cmp {...resolvedProps} action={action} blockId={block.id} projectId={projectId} previewMode={previewMode} contentScale={contentScale} runtimeContext={runtimeContext} onNavigate={onNavigate} onSetPageState={onSetPageState}>{children}</Cmp> : null;
}
