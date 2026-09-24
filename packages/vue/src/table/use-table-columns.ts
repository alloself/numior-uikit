import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { moveItem } from './announce';
import type {
  NuiTableCellLayout,
  NuiTableCellStyle,
  NuiTableColumn,
  NuiTableSticky,
} from './table.types';

const UTILITY_WIDTH = 40;
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

const clampWidth = <T>(column: NuiTableColumn<T>, px: number): number =>
  Math.min(
    column.maxWidth ?? Number.POSITIVE_INFINITY,
    Math.max(column.minWidth ?? MIN_WIDTH, Math.round(px)),
  );

const stickyClasses = (sticky: NuiTableSticky, edge: boolean): string[] => [
  'nui-table__cell--sticky',
  `nui-table__cell--sticky-${sticky}`,
  ...(edge ? ['nui-table__cell--sticky-edge'] : []),
];

export const useTableColumns = <T>(options: ColumnLayoutOptions<T>): ColumnLayout<T> => {
  const measured = ref<Record<string, number>>({});
  const ordered = computed(() => orderColumns(options.columns(), options.order.value));
  const fixed = computed(
    () =>
      Object.keys(options.widths.value).length > 0 ||
      ordered.value.some((column) => column.resizable || column.sticky !== undefined),
  );
  const stickyStart = computed(() => ordered.value.some((column) => column.sticky === 'start'));

  const widthOf = (column: NuiTableColumn<T>): number | undefined =>
    options.widths.value[column.key] ??
    (typeof column.width === 'number' ? column.width : measured.value[column.key]);
  const offsetBefore = (column: NuiTableColumn<T>, sticky: NuiTableSticky): number => {
    const list = sticky === 'start' ? ordered.value : ordered.value.toReversed();
    let sum = sticky === 'start' ? options.utilities() * UTILITY_WIDTH : 0;
    for (const candidate of list) {
      if (candidate === column) {
        break;
      }
      if (candidate.sticky === sticky) {
        sum += widthOf(candidate) ?? 0;
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
    const offset = `${offsetBefore(column, column.sticky)}px`;
    return column.sticky === 'start' ? { insetInlineStart: offset } : { insetInlineEnd: offset };
  };
  const cellClass = (column: NuiTableColumn<T>): string[] =>
    column.sticky === undefined ? [] : stickyClasses(column.sticky, isEdge(column));
  const utilityStyle = (position: number): NuiTableCellStyle =>
    stickyStart.value ? { insetInlineStart: `${position * UTILITY_WIDTH}px` } : undefined;
  const utilityClass = (): string[] => (stickyStart.value ? stickyClasses('start', false) : []);
  const colStyle = (column: NuiTableColumn<T>): NuiTableCellStyle => {
    const width = options.widths.value[column.key];
    const value = width === undefined ? cssWidth(column.width) : `${width}px`;
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
    const cells = table.querySelectorAll('thead th');
    const offset = options.utilities();
    const next: Record<string, number> = {};
    ordered.value.forEach((column, index) => {
      const cell = cells[index + offset];
      if (cell instanceof HTMLElement && cell.offsetWidth > 0) {
        next[column.key] = cell.offsetWidth;
      }
    });
    measured.value = next;
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
