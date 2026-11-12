export interface BlockCache<T> {
  get(key: string): readonly T[] | undefined;
  has(key: string): boolean;
  set(key: string, rows: readonly T[]): void;
  touch(key: string): void;
  entries(): Array<[string, readonly T[]]>;
  clear(): void;
}

export const createBlockCache = <T>(limit: number): BlockCache<T> => {
  const blocks = new Map<string, readonly T[]>();

  const trim = (): void => {
    for (const key of blocks.keys()) {
      if (blocks.size <= limit) {
        return;
      }
      blocks.delete(key);
    }
  };

  return {
    get: (key) => blocks.get(key),
    has: (key) => blocks.has(key),
    set: (key, rows) => {
      blocks.delete(key);
      blocks.set(key, rows);
      trim();
    },
    touch: (key) => {
      const rows = blocks.get(key);

      if (rows === undefined) {
        return;
      }

      blocks.delete(key);
      blocks.set(key, rows);
    },
    entries: () => [...blocks],
    clear: () => {
      blocks.clear();
    },
  };
};
