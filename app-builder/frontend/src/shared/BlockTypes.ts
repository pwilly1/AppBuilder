export type BlockType = 'hero' | 'text' | 'image';

export type Block<T = any> = {
  id: string;
  type: BlockType;
  props: T;
};
