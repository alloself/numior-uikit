import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { moveItem } from './announce';
import type {
  NuiTableCellLayout,
  NuiTableCellStyle,
  NuiTableColumn,
  NuiTableSticky,
} from './table.types';

const MIN_WIDTH = 64;

export interface ColumnLayoutOptions<T> {
  readonly columns: () => readonly NuiTableColumn<T>[];
  readonly order: Ref<string[]>;
  readonly widths: Ref<Record<string, number>>;
  readonly utilities: () => number;
}

export interface ColumnLayout<T> extends NuiTableCellLayout<T> {
  readonly ordered: ComputedRef<NuiTableColumn<T>[]>;
  readonly fixed: ComputedRef<boolean>;
  readonly stickyStart: ComputedRef<boolean>;
  colStyle(column: NuiTableColumn<T>): NuiTableCellStyle;
  setWidth(key: string, px: number): void;
  resetWidth(key: string): void;
  measure(table: HTMLTableElement | null | undefined): void;
  canMoveColumn(from: number, to: number): boolean;
  moveColumn(from: number, to: number): void;
}

const orderColumns = <T>(
  columns: readonly NuiTableColumn<T>[],
  order: readonly string[],
): NuiTableColumn<T>[] => {
  const byKey = new Map(columns.map((column) => [column.key, column]));
  const picked = order.flatMap((key) => {
    const column = byKey.get(key);
    return column ? [column] : [];
  });
  const seen = new Set(order);
  return [...picked, ...columns.filter((column) => !seen.has(column.key))];
};

const cssWidth = (width: number | string | undefined): string | undefined =>
  typeof width === 'number' ? `${width}px` : width;

const colWidthOf = <T>(
  column: NuiTableColumn<T>,
  px: number | undefined,
  natural: number | undefined,
): string | undefined => {
  if (px !== undefined) {
    return `${px}px`;
  }
  if (column.width !== undefined) {
    return cssWidth(column.width);
  }
  return natural === undefined ? undefined : `${natural}px`;
};

const measureHeaders = <T>(
  table: HTMLTableElement,
  columns: readonly NuiTableColumn<T>[],
  offset: number,
): Record<string, number> => {
  const cells = table.querySelectorAll('thead th');
  const next: Record<string, number> = {};
  columns.forEach((column, index) => {
    const width = cells.item(index + offset)?.getBoundingClientRect().width ?? 0;
    if (width > 0) {
      next[column.key] = width;
    }
  });
  return next;
};

const clampWidth = <T>(column: NuiTableColumn<T>, px: number): number =>
  Math.min(
    column.maxWidth ?? Number.POSITIVE_INFINITY,
    Math.max(column.minWidth ?? MIN_WIDTH, Math.round(px)),
  );

const utilityInset = (utilities: number, px: number): string =>
  utilities > 0 ? `calc(${utilities} * var(--_util) + ${px}px)` : `${px}px`;

const utilityStyle = (position: number): NuiTableCellStyle => ({
  insetInlineStart: utilityInset(position, 0),
});

const stickyClasses = (sticky: NuiTableSticky, edge: boolean): string[] => [
  'nui-table__cell--sticky',
  `nui-table__cell--sticky-${sticky}`,
  ...(edge ? ['nui-table__cell--sticky-edge'] : []),
];

export const useTableColumns = <T>(options: ColumnLayoutOptions<T>): ColumnLayout<T> => {
  const measured = ref<Record<string, number>>({});
  const natural = ref<Record<string, number>>({});
  const ordered = computed(() => orderColumns(options.columns(), options.order.value));
  const wantsFixed = computed(
    () =>
      Object.keys(options.widths.value).length > 0 ||
      ordered.value.some((column) => column.resizable || column.sticky !== undefined),
  );
  const colWidth = (column: NuiTableColumn<T>): string | undefined =>
    colWidthOf(column, options.widths.value[column.key], natural.value[column.key]);
  const fixed = computed(
    () => wantsFixed.value && ordered.value.every((column) => colWidth(column) !== undefined),
  );
  const stickyStart = computed(() => ordered.value.some((column) => column.sticky === 'start'));

  const declaredWidth = (column: NuiTableColumn<T>): number | undefined =>
    options.widths.value[column.key] ??
    (typeof column.width === 'number' ? column.width : undefined);
  const renderedWidth = (column: NuiTableColumn<T>): number | undefined =>
    measured.value[column.key] ?? declaredWidth(column) ?? natural.value[column.key];
  const widthOf = (column: NuiTableColumn<T>): number | undefined => {
    const width = declaredWidth(column) ?? measured.value[column.key] ?? natural.value[column.key];
    return width === undefined ? undefined : Math.round(width);
  };
  const offsetBefore = (column: NuiTableColumn<T>, sticky: NuiTableSticky): number => {
    const list = sticky === 'start' ? ordered.value : ordered.value.toReversed();
    let sum = 0;
    for (const candidate of list) {
      if (candidate === column) {
        break;
      }
      if (candidate.sticky === sticky) {
        sum += renderedWidth(candidate) ?? 0;
      }
    }
    return sum;
  };
  const isEdge = (column: NuiTableColumn<T>): boolean => {
    const group = ordered.value.filter((candidate) => candidate.sticky === column.sticky);
    return column.sticky === 'start' ? group.at(-1) === column : group[0] === column;
  };

  const cellStyle = (column: NuiTableColumn<T>): NuiTableCellStyle => {
    if (column.sticky === undefined) {
      return undefined;
    }
    const px = offsetBefore(column, column.sticky);
    if (column.sticky === 'end') {
      return { insetInlineEnd: `${px}px` };
    }
    return { insetInlineStart: utilityInset(options.utilities(), px) };
  };
  const cellClass = (column: NuiTableColumn<T>): string[] =>
    column.sticky === undefined ? [] : stickyClasses(column.sticky, isEdge(column));
  const utilityClass = (position: number): string[] =>
    stickyClasses('start', !stickyStart.value && position === options.utilities() - 1);
  const colStyle = (column: NuiTableColumn<T>): NuiTableCellStyle => {
    const value = colWidth(column);
    return value === undefined ? undefined : { inlineSize: value };
  };

  const setWidth = (key: string, px: number): void => {
    const column = ordered.value.find((candidate) => candidate.key === key);
    if (column) {
      options.widths.value = { ...options.widths.value, [key]: clampWidth(column, px) };
    }
  };
  const resetWidth = (key: string): void => {
    options.widths.value = Object.fromEntries(
      Object.entries(options.widths.value).filter(([entry]) => entry !== key),
    );
  };
  const measure = (table: HTMLTableElement | null | undefined): void => {
    if (!table) {
      return;
    }
    measured.value = measureHeaders(table, ordered.value, options.utilities());
    if (!fixed.value) {
      natural.value = { ...natural.value, ...measured.value };
    }
  };

  const canMoveColumn = (from: number, to: number): boolean => {
    const source = ordered.value[from];
    const target = ordered.value[to];
    return (
      source !== undefined &&
      target !== undefined &&
      source.reorderable === true &&
      source.sticky === target.sticky
    );
  };
  const moveColumn = (from: number, to: number): void => {
    options.order.value = moveItem(
      ordered.value.map((column) => column.key),
      from,
      to,
    );
  };

  return {
    ordered,
    fixed,
    stickyStart,
    widthOf,
    cellStyle,
    cellClass,
    utilityStyle,
    utilityClass,
    colStyle,
    setWidth,
    resetWidth,
    measure,
    canMoveColumn,
    moveColumn,
  };
};
