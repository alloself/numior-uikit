import { createSortJob, type IndexCompare } from './sort';
import { CHECK_INTERVAL, type SliceJob } from './slicer';

export interface TreeTable<T> {
  readonly rows: readonly T[];
  readonly parents: Int32Array;
  readonly depths: Uint16Array;
}

export interface TreeLists {
  readonly starts: Uint32Array;
  readonly lists: Uint32Array;
  readonly root: number;
}

export const flattenTree = <T>(
  roots: readonly T[],
  children: (row: T) => readonly T[] | null | undefined,
): TreeTable<T> => {
  const rows: T[] = [];
  const parentList: number[] = [];
  const depthList: number[] = [];
  const stack: Array<{ readonly row: T; readonly parent: number; readonly depth: number }> = [];

  for (let index = roots.length - 1; index >= 0; index -= 1) {
    const row = roots[index];

    if (row !== undefined) {
      stack.push({ row, parent: -1, depth: 0 });
    }
  }
  while (stack.length > 0) {
    const entry = stack.pop();

    if (entry === undefined) {
      break;
    }
    const index = rows.length;
    rows.push(entry.row);
    parentList.push(entry.parent);
    depthList.push(entry.depth);
    const nested = children(entry.row) ?? [];

    for (let position = nested.length - 1; position >= 0; position -= 1) {
      const child = nested[position];

      if (child !== undefined) {
        stack.push({ row: child, parent: index, depth: entry.depth + 1 });
      }
    }
  }
  return { rows, parents: Int32Array.from(parentList), depths: Uint16Array.from(depthList) };
};

export const createPropagateJob = (pass: Uint8Array, parents: Int32Array): SliceJob => {
  let position = pass.length - 1;

  return {
    total: () => pass.length,
    done: () => pass.length - 1 - position,
    work: (deadline) => {
      while (position >= 0) {
        const parent = parents[position] ?? -1;

        if (pass[position] === 1 && parent >= 0) {
          pass[parent] = 1;
        }
        position -= 1;

        if (position % CHECK_INTERVAL === 0 && performance.now() >= deadline) {
          return false;
        }
      }
      return true;
    },
  };
};

const slotOf = (parents: Int32Array, index: number, root: number): number => {
  const parent = parents[index] ?? -1;
  return parent < 0 ? root : parent;
};

const countChildren = (pass: Uint8Array, parents: Int32Array, root: number): Uint32Array => {
  const counts = new Uint32Array(root + 1);

  for (let index = 0; index < pass.length; index += 1) {
    if (pass[index] === 1) {
      const slot = slotOf(parents, index, root);
      counts[slot] = (counts[slot] ?? 0) + 1;
    }
  }
  return counts;
};

const offsetsOf = (counts: Uint32Array): Uint32Array => {
  const starts = new Uint32Array(counts.length + 1);

  for (let slot = 0; slot < counts.length; slot += 1) {
    starts[slot + 1] = (starts[slot] ?? 0) + (counts[slot] ?? 0);
  }
  return starts;
};

const fillLists = (
  pass: Uint8Array,
  parents: Int32Array,
  starts: Uint32Array,
  root: number,
): Uint32Array => {
  const cursors = starts.slice(0, root + 1);
  const lists = new Uint32Array(starts[root + 1] ?? 0);

  for (let index = 0; index < pass.length; index += 1) {
    if (pass[index] === 1) {
      const slot = slotOf(parents, index, root);
      lists[cursors[slot] ?? 0] = index;
      cursors[slot] = (cursors[slot] ?? 0) + 1;
    }
  }
  return lists;
};

export const buildTreeLists = (pass: Uint8Array, parents: Int32Array): TreeLists => {
  const root = pass.length;
  const starts = offsetsOf(countChildren(pass, parents, root));

  return { starts, lists: fillLists(pass, parents, starts, root), root };
};

export const childrenOf = (tree: TreeLists, slot: number): Uint32Array =>
  tree.lists.subarray(tree.starts[slot] ?? 0, tree.starts[slot + 1] ?? 0);

export const createSiblingSortJob = (tree: TreeLists, compare: IndexCompare): SliceJob => {
  let slot = 0;
  let current: SliceJob | null = null;
  let sorted = 0;

  const nextSlot = (): void => {
    while (slot <= tree.root && (tree.starts[slot + 1] ?? 0) - (tree.starts[slot] ?? 0) < 2) {
      slot += 1;
    }
  };

  return {
    total: () => tree.lists.length,
    done: () => sorted,
    work: (deadline) => {
      nextSlot();

      while (slot <= tree.root) {
        current ??= createSortJob(childrenOf(tree, slot), compare);

        if (!current.work(deadline)) {
          return false;
        }
        sorted += childrenOf(tree, slot).length;
        current = null;
        slot += 1;
        nextSlot();
      }
      return true;
    },
  };
};

export interface TreeWalk {
  readonly all: Uint32Array;
  readonly visible: Int32Array;
}

export const walkTree = (tree: TreeLists, isExpanded: (index: number) => boolean): TreeWalk => {
  const all: number[] = [];
  const visible: number[] = [];
  const stack: Array<{ readonly slot: number; readonly shown: boolean }> = [];
  const roots = childrenOf(tree, tree.root);

  for (let position = roots.length - 1; position >= 0; position -= 1) {
    stack.push({ slot: roots[position] ?? 0, shown: true });
  }
  while (stack.length > 0) {
    const entry = stack.pop();

    if (entry === undefined) {
      break;
    }
    all.push(entry.slot);

    if (entry.shown) {
      visible.push(entry.slot);
    }
    const nested = childrenOf(tree, entry.slot);
    const shown = entry.shown && isExpanded(entry.slot);

    for (let position = nested.length - 1; position >= 0; position -= 1) {
      stack.push({ slot: nested[position] ?? 0, shown });
    }
  }
  return { all: Uint32Array.from(all), visible: Int32Array.from(visible) };
};
