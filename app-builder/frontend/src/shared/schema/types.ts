// Schema-first types (no React imports)

// © 2025 Preston Willis. All rights reserved.
export type BlockType =
  | 'container'
  | 'form'
  | 'hero'
  | 'text'
  | 'button'
  | 'shape'
  | 'badge'
  | 'icon'
  | 'checkbox'
  | 'toggle'
  | 'progressBar'
  | 'input'
  | 'textarea'
  | 'image'
  | 'servicesList'
  | 'contactForm'
  | 'imageGallery';

// Runtime layout classifications describe what kind of slot a block can live in.
export type BlockLayoutClass =
  | 'container'
  | 'hero'
  | 'content'
  | 'action'
  | 'shape'
  | 'badge'
  | 'icon'
  | 'control'
  | 'status'
  | 'input'
  | 'list'
  | 'media'
  | 'form';

export type LayoutWidth = 'full' | 'content' | 'half';
export type LayoutAlign = 'start' | 'center' | 'end';
export type LayoutSpacing = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type RenderAlign = 'start' | 'center' | 'end';

export type SubmitDataFieldRef = {
  fieldBlockId: string;
  targetFieldKey?: string;
};

export type BlockAction =
  | { type: 'navigate'; targetPageId: string }
  | { type: 'submitData'; fields: SubmitDataFieldRef[]; collectionId?: string }
  | { type: 'openUrl'; url: string }
  | { type: 'setPageState'; variableId: string; value: RuntimeValueRef };

export type PageStateVariable = {
  id: string;
  name: string;
  type: 'text';
  initialValue: string;
};

export type PageAppearance = {
  backgroundColor?: string;
};

export type CollectionRecordSelector =
  | { mode: 'latest' }
  | { mode: 'specific'; recordId: string };

export type RuntimeValueRef =
  | { source: 'static'; value: string }
  | { source: 'pageState'; variableId: string; fallback?: string }
  | {
      source: 'collection';
      collectionId: string;
      fieldId: string;
      record?: CollectionRecordSelector;
      fallback?: string;
    }
  | { source: 'formValue'; fieldBlockId: string; fallback?: string };

export type BlockBindings = Record<string, RuntimeValueRef>;

export type AppDataFieldType = 'text' | 'number' | 'boolean' | 'email' | 'date';

export type AppDataCollectionField = {
  id: string;
  key: string;
  label: string;
  type: AppDataFieldType;
  required?: boolean;
};

export type AppDataCollection = {
  id: string;
  name: string;
  publicRead: boolean;
  fields: AppDataCollectionField[];
};

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

export type ResizeBehavior = 'boxOnly' | 'scaleContent';

export type ContentScaleBase = {
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
  resizeBehavior?: ResizeBehavior;
  scaleBase?: ContentScaleBase;
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
  parentId?: string;
  props: Props;
  bindings?: BlockBindings;
  layout?: BlockRuntimeLayout;
  render?: BlockRenderMetadata;
  editorPlacement?: BlockEditorPlacement;
};

export type Page = {
  id: string;
  title?: string;
  path?: string;
  appearance?: PageAppearance;
  stateVariables?: PageStateVariable[];
  blocks: Block[];
};

export type Project = {
  schemaVersion: number;
  id: string;
  name: string;
  pages: Page[];
  dataCollections?: AppDataCollection[];
};
