// Schema-first types (no React imports)

export type BlockType = 'hero' | 'text' | 'image';

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
  id: string;
  name: string;
  pages: Page[];
};
