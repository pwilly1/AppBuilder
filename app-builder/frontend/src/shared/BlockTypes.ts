export type BlockType = 'hero' | 'text' | 'image';

export type Block<T = any> = {
  id: string;
  type: BlockType;
  props: T;
};


export type Page = { id: string; title: string; path: string; blocks: Block[] }
export type Project = { id: string; name: string; pages: Page[] }
