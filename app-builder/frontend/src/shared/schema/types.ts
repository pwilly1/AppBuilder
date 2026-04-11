// Schema-first types (no React imports)

// © 2025 Preston Willis. All rights reserved.
export type BlockType =
  | 'hero'
  | 'text'
  | 'navButton'
  | 'servicesList'
  | 'contactForm'
  | 'imageGallery';

// Runtime layout classifications describe what kind of slot a block can live in.
export type BlockLayoutClass =
  | 'hero'
  | 'content'
  | 'action'
  | 'list'
  | 'media'
  | 'form';

export type LayoutWidth = 'full' | 'content' | 'half';
export type LayoutAlign = 'start' | 'center' | 'end';
export type LayoutSpacing = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type RenderAlign = 'start' | 'center' | 'end';

export type GridSpan = {
  cols: number;
  rows: number;
};

export type GridPlacement = {
  colStart: number;
  rowStart: number;
  colSpan: number;
  rowSpan: number;
};

export type BlockRenderMetadata = {
  widthPx?: number;
  heightPx?: number;
  offsetX?: number;
  offsetY?: number;
  alignX?: RenderAlign;
  alignY?: RenderAlign;
};

export type BlockGridConstraints = {
  defaultSpan: GridSpan;
  minSpan: GridSpan;
  maxSpan: GridSpan;
  allowAutoGrowRows?: boolean;
  allowInnerMove?: boolean;
};

// This is the long-term runtime contract the editor and native preview should share.
export type BlockRuntimeLayout = {
  sectionId?: string;
  slotId?: string;
  order?: number;
  width?: LayoutWidth;
  align?: LayoutAlign;
  spacingTop?: LayoutSpacing;
  spacingBottom?: LayoutSpacing;
  layoutClass?: BlockLayoutClass;
  grid?: GridPlacement;
};

// Transitional metadata only for the editor while we migrate away from freeform canvas state.
export type BlockEditorPlacement = {
  x?: number;
  y?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
};

export type Block<Props = Record<string, any>> = {
  id: string;
  type: BlockType;
  props: Props;
  layout?: BlockRuntimeLayout;
  render?: BlockRenderMetadata;
  editorPlacement?: BlockEditorPlacement;
};

export type Page = {
  id: string;
  title?: string;
  path?: string;
  blocks: Block[];
};

export type Project = {
  schemaVersion: number;
  id: string;
  name: string;
  pages: Page[];
};
