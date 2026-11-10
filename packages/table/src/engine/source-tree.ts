import type { SourceHolds, TableNodeId } from './engine.types';

export interface SourceBranch<T> {
  readonly id: TableNodeId;
  readonly store: SourceStore<T>;
}

export interface SourceStore<T> {
  readonly key: string;
  readonly level: number;
  readonly path: readonly unknown[];
  readonly holds: SourceHolds;
  readonly known: number | undefined;
  readonly parent: T | undefined;
  readonly owner: TableNodeId | undefined;
  readonly open: Map<number, SourceBranch<T>>;
  total: number | undefined;
  more: boolean;
  loadedEnd: number;
  answered: boolean;
}

export interface SourceSpot<T> {
  readonly store: SourceStore<T>;
  readonly index: number;
}

export interface SourceSpan<T> {
  readonly store: SourceStore<T>;
  readonly from: number;
  readonly to: number;
  readonly base: number;
}

interface PlacedBranch<T> {
  readonly index: number;
  readonly before: number;
  readonly size: number;
  readonly store: SourceStore<T>;
}

interface SourceLayout<T> {
  readonly own: number;
  readonly size: number;
  readonly branches: readonly PlacedBranch<T>[];
}

export type SourceCount<T> = (store: SourceStore<T>) => number;

const SEPARATOR = '\u0001';

export const blockKeyOf = (store: string, block: number): string => `${block}${SEPARATOR}${store}`;

export const storeOfBlockKey = (
  key: string,
): { readonly store: string; readonly block: number } => {
  const at = key.indexOf(SEPARATOR);

  return { store: key.slice(at + 1), block: Number(key.slice(0, at)) };
};

export const createSourceStore = <T>(
  seed: Pick<SourceStore<T>, 'key' | 'level' | 'path' | 'holds' | 'known' | 'parent' | 'owner'>,
): SourceStore<T> => ({
  ...seed,
  open: new Map(),
  total: seed.known,
  more: true,
  loadedEnd: 0,
  answered: false,
});

export const createSourceLayouts = <T>(
  count: SourceCount<T>,
): {
  invalidate(): void;
  sizeOf(store: SourceStore<T>): number;
  locate(store: SourceStore<T>, position: number): SourceSpot<T> | undefined;
  spans(store: SourceStore<T>, from: number, to: number): SourceSpan<T>[];
  flatOf(store: SourceStore<T>, base: number, index: number): number;
  bases(store: SourceStore<T>): Map<SourceStore<T>, number>;
} => {
  let layouts = new Map<SourceStore<T>, SourceLayout<T>>();

  const layoutOf = (store: SourceStore<T>): SourceLayout<T> => {
    const known = layouts.get(store);

    if (known !== undefined) {
      return known;
    }
    const own = count(store);
    const branches: PlacedBranch<T>[] = [];
    let before = 0;

    for (const [index, branch] of [...store.open].toSorted((a, b) => a[0] - b[0])) {
      if (index < own) {
        const size = layoutOf(branch.store).size;

        branches.push({ index, before, size, store: branch.store });
        before += size;
      }
    }
    const layout = { own, size: own + before, branches };

    layouts.set(store, layout);
    return layout;
  };

  const locate = (store: SourceStore<T>, position: number): SourceSpot<T> | undefined => {
    const layout = layoutOf(store);

    if (position < 0 || position >= layout.size) {
      return undefined;
    }
    for (const branch of layout.branches) {
      const entry = branch.index + branch.before;

      if (position <= entry) {
        return { store, index: position - branch.before };
      }
      if (position <= entry + branch.size) {
        return locate(branch.store, position - entry - 1);
      }
    }
    return { store, index: position - (layout.size - layout.own) };
  };

  const spans = (store: SourceStore<T>, from: number, to: number, base = 0): SourceSpan<T>[] => {
    const layout = layoutOf(store);
    const found: SourceSpan<T>[] = [];
    let start = 0;

    const own = (until: number, before: number): void => {
      const first = Math.max(start, from - before);
      const last = Math.min(until, to - before);

      if (first < last) {
        found.push({ store, from: first, to: last, base: base + before });
      }
    };

    for (const branch of layout.branches) {
      own(branch.index + 1, branch.before);
      start = branch.index + 1;

      const child = branch.index + branch.before + 1;

      if (from < child + branch.size && to > child) {
        for (const entry of spans(branch.store, from - child, to - child, base + child)) {
          found.push(entry);
        }
      }
    }
    own(layout.own, layout.size - layout.own);
    return found;
  };

  const bases = (
    store: SourceStore<T>,
    base = 0,
    found = new Map<SourceStore<T>, number>(),
  ): Map<SourceStore<T>, number> => {
    found.set(store, base);

    for (const branch of layoutOf(store).branches) {
      bases(branch.store, base + branch.index + branch.before + 1, found);
    }
    return found;
  };

  return {
    bases,
    invalidate: () => {
      layouts = new Map();
    },
    sizeOf: (store) => layoutOf(store).size,
    locate,
    spans,
    flatOf: (store, base, index) =>
      layoutOf(store).branches.reduce(
        (position, branch) => (branch.index < index ? position + branch.size : position),
        base + index,
      ),
  };
};
