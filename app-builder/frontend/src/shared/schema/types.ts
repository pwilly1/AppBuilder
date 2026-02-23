// Schema-first types (no React imports)

// © 2025 Preston Willis. All rights reserved.
export type BlockType = 'hero' | 'text' | 'navButton';

export type Block<Props = Record<string, any>> = {
  id: string;
  type: BlockType;
  props: Props;
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
