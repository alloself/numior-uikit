export interface BlockCache<T> {
  get(block: number): readonly T[] | undefined;
  has(block: number): boolean;
  set(block: number, rows: readonly T[]): void;
  touch(block: number): void;
  keys(): number[];
  clear(): void;
}

export const createBlockCache = <T>(limit: number): BlockCache<T> => {
  const blocks = new Map<number, readonly T[]>();

  const trim = (): void => {
    for (const block of blocks.keys()) {
      if (blocks.size <= limit) {
        return;
      }
      blocks.delete(block);
    }
  };

  return {
    get: (block) => blocks.get(block),
    has: (block) => blocks.has(block),
    set: (block, rows) => {
      blocks.delete(block);
      blocks.set(block, rows);
      trim();
    },
    touch: (block) => {
      const rows = blocks.get(block);

      if (rows !== undefined) {
        blocks.delete(block);
        blocks.set(block, rows);
      }
    },
    keys: () => [...blocks.keys()].toSorted((a, b) => a - b),
    clear: () => {
      blocks.clear();
    },
  };
};
