import type { CellValue } from '../cell.types';
import { ordered } from '../calc/coerce';
import { EMPTY, errorValue, numberValue } from '../values';
import {
  accumulatePivot,
  createPivotAccumulator,
  finishPivot,
  mergePivot,
} from './pivot-aggregate';
import type { PivotAccumulator } from './pivot-aggregate';
import { pivotKey } from './pivot-cache';
import type {
  PivotCache,
  PivotDefinition,
  PivotField,
  PivotLine,
  PivotResult,
  PivotShowAs,
} from './pivot.types';

interface Tree {
  readonly children: Map<number, number>[];
  readonly items: number[];
  readonly parents: number[];
}

interface Axis {
  readonly levels: readonly number[];
  readonly real: readonly number[];
  readonly tree: Tree;
  readonly leaves: Int32Array;
}

interface Totals {
  readonly accumulators: readonly Map<number, PivotAccumulator>[];
  readonly columns: number;
}

interface Placed {
  readonly axis: Axis;
  readonly level: number;
  readonly line: PivotLine;
}

export const VALUES_FIELD = -2;

const NOT_AVAILABLE = errorValue('#N/A');

const DIVIDE_BY_ZERO = errorValue('#DIV/0!');

const MANUAL: PivotField = { order: [], hidden: [], sort: 'manual', subtotal: true };

export const pivotFieldOf = (definition: PivotDefinition, field: number): PivotField =>
  definition.fields[field] ?? MANUAL;

export const itemOrder = (field: PivotField, items: readonly CellValue[]): number[] => {
  const indices = items.map((_, index) => index);

  if (field.sort !== 'manual') {
    const compare = ordered(field.sort === 'ascending' ? 1 : -1);

    return indices.toSorted((left, right) => compare(items[left] ?? EMPTY, items[right] ?? EMPTY));
  }

  const positions = new Map(items.map((item, index) => [pivotKey(item), index]));
  const placed = new Set<number>();

  const manual = field.order.reduce<number[]>((found, value) => {
    const index = positions.get(pivotKey(value));

    if (index !== undefined && !placed.has(index)) {
      placed.add(index);
      found.push(index);
    }
    return found;
  }, []);

  return indices.reduce((order, index) => {
    if (!placed.has(index)) {
      order.push(index);
    }
    return order;
  }, manual);
};

const ranksOf = (field: PivotField, items: readonly CellValue[]): Int32Array => {
  const hidden = new Set(field.hidden.map(pivotKey));
  const ranks = new Int32Array(items.length).fill(-1);
  let rank = 0;

  for (const index of itemOrder(field, items)) {
    if (!hidden.has(pivotKey(items[index] ?? EMPTY))) {
      ranks[index] = rank;
      rank += 1;
    }
  }
  return ranks;
};

const visibleRecords = (
  definition: PivotDefinition,
  cache: PivotCache,
  ranks: ReadonlyMap<number, Int32Array>,
): Uint8Array => {
  const visible = new Uint8Array(cache.count).fill(1);

  ranks.forEach((rank, field) => {
    const records = cache.group(field)?.records;

    for (let record = 0; record < cache.count; record += 1) {
      visible[record] = (visible[record] ?? 0) & Number((rank[records?.[record] ?? 0] ?? -1) >= 0);
    }
  });

  definition.filters.forEach((filter) => {
    const field = cache.group(filter.field);

    if (filter.selected === undefined || field === undefined) {
      return;
    }

    const wanted = pivotKey(filter.selected);

    for (let record = 0; record < cache.count; record += 1) {
      const item = field.items[field.records[record] ?? 0] ?? EMPTY;

      visible[record] = (visible[record] ?? 0) & Number(pivotKey(item) === wanted);
    }
  });

  return visible;
};

const buildAxis = (levels: readonly number[], cache: PivotCache, visible: Uint8Array): Axis => {
  const real = levels.filter((level) => level !== VALUES_FIELD);
  const groups = real.map((field) => cache.group(field)?.records);
  const tree: Tree = { children: [new Map()], items: [-1], parents: [-1] };
  const leaves = new Int32Array(cache.count);

  for (let record = 0; record < cache.count; record += 1) {
    if (visible[record] === 1) {
      let node = 0;

      groups.forEach((records) => {
        const item = records?.[record] ?? 0;
        const children = tree.children[node] ?? new Map<number, number>();
        let next = children.get(item);

        if (next === undefined) {
          next = tree.items.length;
          children.set(item, next);
          tree.children.push(new Map());
          tree.items.push(item);
          tree.parents.push(node);
        }
        node = next;
      });

      leaves[record] = node;
    }
  }
  return { levels, real, tree, leaves };
};

const lineageOf = (tree: Tree, node: number): number[] => {
  const lineage: number[] = [];

  for (let current = node; current >= 0; current = tree.parents[current] ?? -1) {
    lineage.push(current);
  }
  return lineage;
};

const rolledUp = (
  leaves: ReadonlyMap<number, PivotAccumulator>,
  axes: { readonly rows: Axis; readonly columns: Axis },
  columnCount: number,
): Map<number, PivotAccumulator> => {
  const totals = new Map(leaves);

  leaves.forEach((source, key) => {
    const rowLeaf = Math.floor(key / columnCount);
    const columnLeaf = key % columnCount;
    const columnLineage = lineageOf(axes.columns.tree, columnLeaf);

    lineageOf(axes.rows.tree, rowLeaf).forEach((row) => {
      columnLineage.forEach((col) => {
        if (row !== rowLeaf || col !== columnLeaf) {
          const at = row * columnCount + col;
          const target = totals.get(at) ?? createPivotAccumulator();

          mergePivot(target, source);
          totals.set(at, target);
        }
      });
    });
  });

  return totals;
};

const accumulate = (
  definition: PivotDefinition,
  cache: PivotCache,
  axes: { readonly rows: Axis; readonly columns: Axis; readonly visible: Uint8Array },
): Totals => {
  const { rows, columns, visible } = axes;
  const columnCount = columns.tree.items.length;

  const accumulators = definition.values.map((value) => {
    const leaves = new Map<number, PivotAccumulator>();
    const values = cache.fields[value.field]?.values ?? [];

    for (let record = 0; record < cache.count; record += 1) {
      if (visible[record] === 1) {
        const key = (rows.leaves[record] ?? 0) * columnCount + (columns.leaves[record] ?? 0);
        let target = leaves.get(key);

        if (target === undefined) {
          target = createPivotAccumulator();
          leaves.set(key, target);
        }
        accumulatePivot(target, values[record] ?? EMPTY);
      }
    }
    return rolledUp(leaves, axes, columnCount);
  });

  return { accumulators, columns: columnCount };
};

const childrenOf = (axis: Axis, node: number, ranks: Int32Array | undefined): number[][] =>
  [...(axis.tree.children[node] ?? new Map<number, number>())]
    .filter(([item]) => (ranks?.[item] ?? 0) >= 0)
    .toSorted(([left], [right]) => (ranks?.[left] ?? 0) - (ranks?.[right] ?? 0));

const linesOf = (
  definition: PivotDefinition,
  axis: Axis,
  ranks: ReadonlyMap<number, Int32Array>,
  top: boolean,
): PivotLine[] => {
  const lines: PivotLine[] = [];
  const { levels } = axis;
  const count = definition.values.length;

  const subtotalOf = (level: number): boolean => {
    const field = levels[level] ?? VALUES_FIELD;

    return (
      field !== VALUES_FIELD &&
      pivotFieldOf(definition, field).subtotal &&
      levels.slice(level + 1).some((deeper) => deeper !== VALUES_FIELD)
    );
  };

  const walk = (level: number, node: number, items: readonly number[], value: number): void => {
    const field = levels[level] ?? VALUES_FIELD;
    const last = level === levels.length - 1;

    const entries =
      field === VALUES_FIELD
        ? definition.values.map((_, index) => [index, node])
        : childrenOf(axis, node, ranks.get(field));

    entries.forEach(([item = 0, child = 0]) => {
      const next = [...items, item];
      const nextValue = field === VALUES_FIELD ? item : value;
      const known = nextValue >= 0 || count === 1 || !levels.includes(VALUES_FIELD);

      if (last) {
        lines.push({
          kind: 'item',
          items: next,
          depth: level,
          node: child,
          value: nextValue,
          shows: true,
        });

        return;
      }
      if (top) {
        lines.push({
          kind: 'group',
          items: next,
          depth: level,
          node: child,
          value: nextValue,
          shows: subtotalOf(level) && known,
        });
      }
      walk(level + 1, child, next, nextValue);
      if (!top && subtotalOf(level)) {
        const values = known ? [nextValue] : definition.values.map((_, index) => index);

        values.forEach((data) => {
          lines.push({
            kind: 'subtotal',
            items: next,
            depth: level,
            node: child,
            value: data,
            shows: true,
          });
        });
      }
    });
  };

  if (levels.length === 0) {
    return [{ kind: 'item', items: [], depth: -1, node: 0, value: -1, shows: true }];
  }

  walk(0, 0, [], -1);
  return lines;
};

const grandLines = (axis: Axis, count: number, enabled: boolean): PivotLine[] => {
  if (!enabled || axis.real.length === 0) {
    return [];
  }

  const values = axis.levels.includes(VALUES_FIELD) && count > 1 ? [...Array(count).keys()] : [-1];

  return values.map((value) => ({
    kind: 'grand',
    items: [],
    depth: -1,
    node: 0,
    value,
    shows: true,
  }));
};

const realItems = (axis: Axis, line: PivotLine): number[] =>
  line.items.filter((_, level) => axis.levels[level] !== VALUES_FIELD);

const nodeAt = (axis: Axis, items: readonly number[]): number | undefined =>
  items.reduce<number | undefined>(
    (node, item) => (node === undefined ? undefined : axis.tree.children[node]?.get(item)),
    0,
  );

const ratio = (value: CellValue, base: CellValue): CellValue => {
  if (value.kind !== 'number' || base.kind !== 'number') {
    return value.kind === 'error' ? value : base.kind === 'error' ? base : EMPTY;
  }
  return base.value === 0 ? DIVIDE_BY_ZERO : numberValue(value.value / base.value);
};

export const dataIndexOf = (
  definition: PivotDefinition,
  row: PivotLine,
  col: PivotLine,
): number => {
  if (row.value >= 0) {
    return row.value;
  }
  if (col.value >= 0) {
    return col.value;
  }
  return definition.values.length === 1 ? 0 : -1;
};

export const normalizedPivot = (definition: PivotDefinition): PivotDefinition =>
  definition.values.length > 1 &&
  !definition.rows.includes(VALUES_FIELD) &&
  !definition.columns.includes(VALUES_FIELD)
    ? { ...definition, columns: [...definition.columns, VALUES_FIELD] }
    : definition;

const compared = (
  show: Extract<PivotShowAs, { readonly item: unknown }>,
  value: CellValue,
  base: CellValue,
): CellValue => {
  if (base.kind === 'empty' || value.kind !== 'number') {
    return base.kind === 'empty' ? EMPTY : value;
  }
  if (show.kind === 'difference') {
    return base.kind === 'number' ? numberValue(value.value - base.value) : base;
  }

  const share = ratio(value, base);

  return show.kind === 'percentDiff' && share.kind === 'number'
    ? numberValue(share.value - 1)
    : share;
};

const createEvaluator = (
  definition: PivotDefinition,
  cache: PivotCache,
  context: {
    readonly rows: Axis;
    readonly columns: Axis;
    readonly totals: Totals;
    readonly ranks: ReadonlyMap<number, Int32Array>;
  },
) => {
  const { rows, columns, totals, ranks } = context;

  const raw = (data: number, row: number, col: number): CellValue => {
    const value = definition.values[data];
    const target = totals.accumulators[data]?.get(row * totals.columns + col);

    return value === undefined || target === undefined
      ? EMPTY
      : finishPivot(value.aggregate, target);
  };

  const placedOf = (field: number, row: PivotLine, col: PivotLine): Placed | undefined => {
    const rowLevel = rows.real.indexOf(field);
    const colLevel = columns.real.indexOf(field);

    if (rowLevel >= 0) {
      return { axis: rows, level: rowLevel, line: row };
    }
    return colLevel >= 0 ? { axis: columns, level: colLevel, line: col } : undefined;
  };

  const shifted = (data: number, placed: Placed, other: number, item: number): CellValue => {
    const items = realItems(placed.axis, placed.line);
    const node = nodeAt(placed.axis, items.with(placed.level, item));

    if (node === undefined) {
      return EMPTY;
    }
    return placed.axis === rows ? raw(data, node, other) : raw(data, other, node);
  };

  const baseItem = (
    show: Extract<PivotShowAs, { readonly item: unknown }>,
    rank: Int32Array,
    current: number,
  ): number | undefined => {
    const order = [...rank.keys()]
      .filter((item) => (rank[item] ?? -1) >= 0)
      .toSorted((left, right) => (rank[left] ?? 0) - (rank[right] ?? 0));

    const at = order.indexOf(current);
    const items = cache.group(show.field)?.items ?? [];

    if (show.item === 'previous') {
      return order[at - 1];
    }
    if (show.item === 'next') {
      return order[at + 1];
    }

    const wanted = pivotKey(show.item);
    const found = items.findIndex((value) => pivotKey(value) === wanted);

    return found < 0 ? undefined : found;
  };

  const runningTotal = (
    data: number,
    placed: Placed,
    rank: Int32Array,
    position: { readonly current: number; readonly other: number },
  ): CellValue =>
    numberValue(
      [...rank.keys()].reduce((sum, item) => {
        const included =
          (rank[item] ?? -1) >= 0 && (rank[item] ?? 0) <= (rank[position.current] ?? 0);

        const total = included ? shifted(data, placed, position.other, item) : EMPTY;

        return sum + (total.kind === 'number' ? total.value : 0);
      }, 0),
    );

  const relative = (data: number, value: CellValue, row: PivotLine, col: PivotLine): CellValue => {
    const show = definition.values[data]?.showAs;

    if (show === undefined || !('field' in show)) {
      return value;
    }

    const placed = placedOf(show.field, row, col);
    const rank = ranks.get(show.field);

    if (placed === undefined || rank === undefined) {
      return NOT_AVAILABLE;
    }

    const current = realItems(placed.axis, placed.line)[placed.level];
    const other = placed.axis === rows ? col.node : row.node;

    if (current === undefined) {
      return EMPTY;
    }
    if (show.kind === 'runTotal') {
      return runningTotal(data, placed, rank, { current, other });
    }

    const item = baseItem(show, rank, current);

    return compared(show, value, item === undefined ? EMPTY : shifted(data, placed, other, item));
  };

  const shown = (data: number, row: PivotLine, col: PivotLine): CellValue => {
    const value = raw(data, row.node, col.node);
    const show = definition.values[data]?.showAs.kind ?? 'normal';

    switch (show) {
      case 'normal':
        return value;
      case 'percentOfTotal':
        return ratio(value, raw(data, 0, 0));
      case 'percentOfRow':
        return ratio(value, raw(data, row.node, 0));
      case 'percentOfCol':
        return ratio(value, raw(data, 0, col.node));
      case 'index': {
        const share = ratio(value, raw(data, row.node, 0));
        const whole = ratio(raw(data, 0, col.node), raw(data, 0, 0));

        return ratio(share, whole);
      }
      default:
        return value.kind === 'empty' ? value : relative(data, value, row, col);
    }
  };

  return (row: PivotLine, col: PivotLine): CellValue => {
    const data = dataIndexOf(definition, row, col);

    return data < 0 || !row.shows ? EMPTY : shown(data, row, col);
  };
};

export const computePivot = (input: PivotDefinition, cache: PivotCache): PivotResult => {
  const definition = normalizedPivot(input);

  const axisFields = [
    ...definition.rows,
    ...definition.columns,
    ...definition.filters.map((filter) => filter.field),
  ];

  const ranks = new Map(
    axisFields.reduce<[number, Int32Array][]>((found, field) => {
      const items = field === VALUES_FIELD ? undefined : cache.group(field)?.items;

      if (
        field !== VALUES_FIELD &&
        items !== undefined &&
        !found.some(([known]) => known === field)
      ) {
        found.push([field, ranksOf(pivotFieldOf(definition, field), items)]);
      }
      return found;
    }, []),
  );

  const visible = visibleRecords(definition, cache, ranks);
  const multiple = definition.values.length > 1;

  const strip = (levels: readonly number[]) =>
    multiple ? levels : levels.filter((level) => level !== VALUES_FIELD);

  const rows = buildAxis(strip(definition.rows), cache, visible);
  const columns = buildAxis(strip(definition.columns), cache, visible);
  const totals = accumulate(definition, cache, { rows, columns, visible });
  const count = definition.values.length;

  const rowLines = [
    ...linesOf(definition, rows, ranks, definition.layout !== 'tabular'),
    ...grandLines(rows, count, definition.columnTotals),
  ];

  const columnLines = [
    ...linesOf(definition, columns, ranks, false),
    ...grandLines(columns, count, definition.rowTotals),
  ];

  const evaluate = createEvaluator(definition, cache, { rows, columns, totals, ranks });

  return {
    rows: rowLines,
    columns: columnLines,
    cells: rowLines.map((row) => columnLines.map((col) => evaluate(row, col))),
  };
};
