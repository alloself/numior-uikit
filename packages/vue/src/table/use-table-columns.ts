import { computed, type ComputedRef, type Ref } from 'vue';
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

export interface StickyExtents {
  readonly start: string;
  readonly end: string;
}

export interface ColumnLayout<T> extends NuiTableCellLayout<T> {
  readonly ordered: ComputedRef<NuiTableColumn<T>[]>;
  readonly stickyStart: ComputedRef<boolean>;
  colStyle(column: NuiTableColumn<T>): NuiTableCellStyle;
  setWidth(key: string, px: number): void;
  resetWidth(key: string): void;
  measure(table: HTMLTableElement | null | undefined): void;
  stickyExtents(): StickyExtents;
  canMoveColumn(from: number, to: number): boolean;
  moveColumn(from: number, to: number): void;
}

interface MeasureState {
  fixed: boolean;
  sticky: number;
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

const utilityInset = (utilities: number, offset: string): string =>
  utilities > 0 ? `calc(${utilities} * var(--_util) + ${offset})` : offset;

const utilityStyle = (position: number): NuiTableCellStyle => ({
  insetInlineStart: utilityInset(position, '0px'),
});

const stickyClasses = (sticky: NuiTableSticky, edge: boolean): string[] => [
  'nui-table__cell--sticky',
  `nui-table__cell--sticky-${sticky}`,
  ...(edge ? ['nui-table__cell--sticky-edge'] : []),
];

const stickyVar = (index: number): string => `--_sticky-${index}`;

const elementAt = (list: NodeListOf<Element>, index: number): HTMLElement | null => {
  const found = list.item(index);
  return found instanceof HTMLElement ? found : null;
};

const writeResizer = (cell: HTMLElement | null, width: number | undefined): void => {
  const resizer = cell?.querySelector('.nui-table__resizer');

  if (resizer instanceof HTMLElement) {
    if (width === undefined) {
      resizer.removeAttribute('aria-valuenow');
    } else {
      resizer.setAttribute('aria-valuenow', String(width));
    }
  }
};

export const useTableColumns = <T>(options: ColumnLayoutOptions<T>): ColumnLayout<T> => {
  const natural = new Map<string, number>();
  const state: MeasureState = { fixed: false, sticky: 0 };
  const ordered = computed(() => orderColumns(options.columns(), options.order.value));

  const wantsFixed = computed(
    () =>
      Object.keys(options.widths.value).length > 0 ||
      ordered.value.some((column) => column.resizable || column.sticky !== undefined),
  );

  const stickyStart = computed(() => ordered.value.some((column) => column.sticky === 'start'));

  const declaredWidth = (column: NuiTableColumn<T>): number | undefined =>
    options.widths.value[column.key] ??
    (typeof column.width === 'number' ? column.width : undefined);

  const widthOf = (column: NuiTableColumn<T>): number | undefined => {
    const width = declaredWidth(column) ?? natural.get(column.key);
    return width === undefined ? undefined : Math.round(width);
  };

  const positions = computed(
    () => new Map(ordered.value.map((column, index) => [column, index] as const)),
  );

  const edges = computed(() => {
    const starts = ordered.value.filter((column) => column.sticky === 'start');
    const ends = ordered.value.filter((column) => column.sticky === 'end');

    return new Set([starts.at(-1), ends[0]]);
  });

  const stickyOffsets = (): Map<NuiTableColumn<T>, number> => {
    const offsets = new Map<NuiTableColumn<T>, number>();

    const add = (columns: readonly NuiTableColumn<T>[], sticky: NuiTableSticky): void => {
      let sum = 0;

      for (const column of columns) {
        if (column.sticky === sticky) {
          offsets.set(column, sum);
          sum += widthOf(column) ?? 0;
        }
      }
    };

    add(ordered.value, 'start');
    add(ordered.value.toReversed(), 'end');
    return offsets;
  };

  const stickyWidth = (sticky: NuiTableSticky): number =>
    ordered.value.reduce(
      (total, column) => (column.sticky === sticky ? total + (widthOf(column) ?? 0) : total),
      0,
    );

  const stickyExtents = (): StickyExtents => ({
    start: utilityInset(options.utilities(), `${stickyWidth('start')}px`),
    end: `${stickyWidth('end')}px`,
  });

  const cellStyle = (column: NuiTableColumn<T>): NuiTableCellStyle => {
    if (column.sticky === undefined) {
      return undefined;
    }

    const offset = `var(${stickyVar(positions.value.get(column) ?? 0)}, 0px)`;

    if (column.sticky === 'end') {
      return { insetInlineEnd: offset };
    }

    return { insetInlineStart: utilityInset(options.utilities(), offset) };
  };

  const cellClass = (column: NuiTableColumn<T>): string[] =>
    column.sticky === undefined ? [] : stickyClasses(column.sticky, edges.value.has(column));

  const utilityClass = (position: number): string[] =>
    stickyClasses('start', !stickyStart.value && position === options.utilities() - 1);

  const colStyle = (column: NuiTableColumn<T>): NuiTableCellStyle => {
    const px = options.widths.value[column.key];
    const value = px === undefined ? cssWidth(column.width) : `${px}px`;
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

  const captureNatural = (cells: NodeListOf<Element>, offset: number): void => {
    ordered.value.forEach((column, index) => {
      if (state.fixed && natural.has(column.key)) {
        return;
      }

      const width = elementAt(cells, index + offset)?.getBoundingClientRect().width ?? 0;

      if (width > 0) {
        natural.set(column.key, width);
      }
    });
  };

  const writeColumns = (table: HTMLTableElement, offset: number, fixed: boolean): void => {
    const cells = table.querySelectorAll('thead th');
    const cols = table.querySelectorAll('colgroup col');

    ordered.value.forEach((column, index) => {
      const col = elementAt(cols, index + offset);
      const width = widthOf(column);

      if (col && declaredWidth(column) === undefined && column.width === undefined) {
        col.style.inlineSize = fixed && width !== undefined ? `${width}px` : '';
      }

      writeResizer(elementAt(cells, index + offset), width);
    });
  };

  const writeSticky = (table: HTMLTableElement): void => {
    const columns = ordered.value;
    const offsets = stickyOffsets();

    for (let index = 0; index < Math.max(columns.length, state.sticky); index += 1) {
      const column = columns[index];
      const offset = column === undefined ? undefined : offsets.get(column);

      if (offset === undefined) {
        table.style.removeProperty(stickyVar(index));
      } else {
        table.style.setProperty(stickyVar(index), `${offset}px`);
      }
    }

    state.sticky = columns.length;
  };

  const measure = (table: HTMLTableElement | null | undefined): void => {
    if (!table) {
      return;
    }

    const offset = options.utilities();

    captureNatural(table.querySelectorAll('thead th'), offset);

    const fixed =
      wantsFixed.value && ordered.value.every((column) => widthOf(column) !== undefined);

    writeColumns(table, offset, fixed);
    table.style.tableLayout = fixed ? 'fixed' : '';
    state.fixed = fixed;
    writeSticky(table);
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
    stickyExtents,
    canMoveColumn,
    moveColumn,
  };
};
