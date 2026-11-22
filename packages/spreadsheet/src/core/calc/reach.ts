import { min, sortedLastIndex } from 'lodash-es';
import { MAX_COLS } from '../address';
import type { DependencyGraph, Precedent } from './graph';

export interface ReachSource {
  readonly cellsOf: (sheet: number) => ReadonlyMap<number, number> | undefined;
  readonly precedentsOf: (key: number) => readonly Precedent[];
}

export type DependentsOf = Pick<DependencyGraph, 'forEachDependent'>;

interface Column {
  cells: number[];
  keys: number[];
  sorted: boolean;
  next: number;
}

interface CornerIndex {
  readonly empty: (bottom: number) => boolean;
  readonly take: (bottom: number, right: number, visit: (key: number) => void) => void;
}

const rowOf = (cell: number): number => Math.floor(cell / MAX_COLS);

const columnsOf = (cells: ReadonlyMap<number, number> | undefined): Map<number, Column> => {
  const columns = new Map<number, Column>();

  cells?.forEach((key, cell) => {
    const col = cell % MAX_COLS;
    const known = columns.get(col);

    if (known === undefined) {
      columns.set(col, { cells: [cell], keys: [key], sorted: true, next: 0 });
      return;
    }
    known.sorted &&= (known.cells.at(-1) ?? 0) < cell;
    known.cells.push(cell);
    known.keys.push(key);
  });

  return columns;
};

const sortColumn = (column: Column): void => {
  const order = column.cells
    .map((_cell, index) => index)
    .toSorted((left, right) => (column.cells[left] ?? 0) - (column.cells[right] ?? 0));

  column.cells = order.map((index) => column.cells[index] ?? 0);
  column.keys = order.map((index) => column.keys[index] ?? 0);
  column.sorted = true;
};

const firstAtMost = (
  tree: Float64Array,
  node: number,
  start: number,
  width: number,
  last: number,
  bound: number,
): number => {
  if (start > last || (tree[node] ?? Number.POSITIVE_INFINITY) > bound) {
    return -1;
  }
  if (width === 1) {
    return start;
  }

  const half = width / 2;
  const left = firstAtMost(tree, node * 2, start, half, last, bound);

  return left === -1 ? firstAtMost(tree, node * 2 + 1, start + half, half, last, bound) : left;
};

const leafSize = (count: number): number => {
  let size = 1;

  while (size < count) {
    size *= 2;
  }
  return size;
};

const nextRow = (column: Column): number => {
  const cell = column.cells[column.next];

  return cell === undefined ? Number.POSITIVE_INFINITY : rowOf(cell);
};

const cornerIndex = (cells: ReadonlyMap<number, number> | undefined): CornerIndex => {
  const byColumn = columnsOf(cells);
  const cols = [...byColumn.keys()].toSorted((left, right) => left - right);
  const columns = cols.flatMap((col) => byColumn.get(col) ?? []);
  const size = leafSize(columns.length);
  const tree = new Float64Array(size * 2).fill(Number.POSITIVE_INFINITY);

  const lift = (leaf: number): void => {
    for (let node = Math.floor(leaf / 2); node >= 1; node = Math.floor(node / 2)) {
      tree[node] = Math.min(
        tree[node * 2] ?? Number.POSITIVE_INFINITY,
        tree[node * 2 + 1] ?? Number.POSITIVE_INFINITY,
      );
    }
  };

  columns.forEach((column, index) => {
    tree[size + index] = rowOf(min(column.cells) ?? 0);
  });

  for (let node = size - 1; node >= 1; node -= 1) {
    tree[node] = Math.min(
      tree[node * 2] ?? Number.POSITIVE_INFINITY,
      tree[node * 2 + 1] ?? Number.POSITIVE_INFINITY,
    );
  }

  const pop = (index: number, bottom: number, visit: (key: number) => void): void => {
    const column = columns[index];

    if (column === undefined) {
      return;
    }
    if (!column.sorted) {
      sortColumn(column);
    }
    for (; column.next < column.cells.length && nextRow(column) <= bottom; column.next += 1) {
      visit(column.keys[column.next] ?? 0);
    }
    tree[size + index] = nextRow(column);
    lift(size + index);
  };

  return {
    empty: (bottom) => (tree[1] ?? Number.POSITIVE_INFINITY) > bottom,
    take: (bottom, right, visit) => {
      if ((tree[1] ?? Number.POSITIVE_INFINITY) > bottom) {
        return;
      }

      const last = sortedLastIndex(cols, right) - 1;

      for (
        let found = firstAtMost(tree, 1, 0, size, last, bottom);
        found !== -1;
        found = firstAtMost(tree, 1, 0, size, last, bottom)
      ) {
        pop(found, bottom, visit);
      }
    },
  };
};

export const reachOf = (source: ReachSource, area: Precedent): ReadonlySet<number> => {
  const indexes = new Map<number, CornerIndex>();
  const reached = new Set<number>();
  const boxes: Precedent[] = [area];

  let lastSheet = -1;
  let lastIndex: CornerIndex | undefined;

  const indexOf = (sheet: number): CornerIndex => {
    if (sheet === lastSheet && lastIndex !== undefined) {
      return lastIndex;
    }

    const found = indexes.get(sheet) ?? cornerIndex(source.cellsOf(sheet));

    indexes.set(sheet, found);
    lastSheet = sheet;
    lastIndex = found;
    return found;
  };

  const visit = (key: number): void => {
    reached.add(key);

    const precedents = source.precedentsOf(key);

    for (let at = 0; at < precedents.length; at += 1) {
      const precedent = precedents[at];

      if (precedent === undefined || indexOf(precedent.sheet).empty(precedent.range.bottom)) {
        continue;
      }

      boxes.push(precedent);
    }
  };

  for (let box = boxes.pop(); box !== undefined; box = boxes.pop()) {
    indexOf(box.sheet).take(box.range.bottom, box.range.right, visit);
  }
  return reached;
};

export const dependentsWithin = (
  graph: DependentsOf,
  keys: ReadonlySet<number>,
  left: (key: number) => void,
): DependentsOf => ({
  forEachDependent: (sheet, row, col, visit) => {
    graph.forEachDependent(sheet, row, col, (key) => {
      if (!keys.has(key)) {
        left(key);
        return;
      }

      visit(key);
    });
  },
});
