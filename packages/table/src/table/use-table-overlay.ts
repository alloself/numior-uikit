import { computed, onMounted, watch, type ComputedRef, type ShallowRef } from 'vue';
import type { VirtualList } from '@numior/primitives';
import { boxOf } from './table-ranges';
import type { PlacedColumn, TableLayout } from './table-layout';
import type {
  NuiTableOverlaySlot,
  NuiTableRange,
  NuiTableRect,
  NuiTableWindow,
  TableCellPosition,
  TablePaneName,
} from './table.types';

export interface TableOverlayOptions {
  readonly viewport: Readonly<ShallowRef<HTMLElement | null>>;
  readonly rows: VirtualList;
  readonly columns: VirtualList;
  readonly layout: () => TableLayout;
  readonly dataKeys: () => readonly string[];
  readonly rowCount: () => number;
  readonly headSize: () => number;
  readonly headRows: () => number;
  readonly pinnedRows: () => number;
  readonly dataOffset: () => number;
  readonly onWindow: (window: NuiTableWindow) => void;
}

export interface TableOverlay {
  readonly scope: ComputedRef<NuiTableOverlaySlot>;
  readonly planeStyle: ComputedRef<Readonly<Record<string, string>>>;
  rectOf(range: NuiTableRange): NuiTableRect | undefined;
  cellFromPoint(x: number, y: number): TableCellPosition | undefined;
}

const CELL = '.nui-table__cell';

const paneBase = (layout: TableLayout, pane: TablePaneName): number => {
  switch (pane) {
    case 'start':
      return 0;
    case 'centre':
      return layout.startWidth;
    case 'end':
      return layout.startWidth + layout.centreWidth;
  }
};

const sameWindow = (a: NuiTableWindow, b: NuiTableWindow): boolean =>
  a.rows.start === b.rows.start &&
  a.rows.end === b.rows.end &&
  a.cols.start === b.cols.start &&
  a.cols.end === b.cols.end;

const ariaIndex = (element: Element | null | undefined, name: string): number =>
  Number(element?.getAttribute(name));

export const useTableOverlay = (options: TableOverlayOptions): TableOverlay => {
  const placed = computed(
    () => new Map(options.layout().visual.map((column) => [column.key, column])),
  );

  const startData = computed(() =>
    options.layout().start.reduce((count, column) => count + Number(column.kind === 'data'), 0),
  );

  const columnOf = (col: number): PlacedColumn | undefined => {
    const key = options.dataKeys()[col];

    return key === undefined ? undefined : placed.value.get(key);
  };

  const edgeOf = (column: PlacedColumn): number =>
    paneBase(options.layout(), column.pane) + column.offset;

  const rectOf = (range: NuiTableRange): NuiTableRect | undefined => {
    const box = boxOf(range);
    const first = columnOf(box.start);
    const last = columnOf(box.end);

    if (
      first === undefined ||
      last === undefined ||
      box.top < 0 ||
      box.bottom >= options.rowCount()
    ) {
      return undefined;
    }
    const rows = options.rows;

    return {
      top: options.headSize() + rows.offsetOf(box.top) - rows.shift.value,
      start: edgeOf(first),
      width: edgeOf(last) + last.width - edgeOf(first),
      height: rows.offsetOf(box.bottom + 1) - rows.offsetOf(box.top),
    };
  };

  const positionOf = (cell: Element): TableCellPosition | undefined => {
    const row =
      ariaIndex(cell.parentElement, 'aria-rowindex') -
      options.headRows() -
      1 -
      options.pinnedRows();

    const col = ariaIndex(cell, 'aria-colindex') - 1 - options.dataOffset();

    return row >= 0 && row < options.rowCount() && col >= 0 && col < options.dataKeys().length
      ? { row, col }
      : undefined;
  };

  const cellFromPoint = (x: number, y: number): TableCellPosition | undefined => {
    const viewport = options.viewport.value;

    if (viewport === null || typeof document.elementsFromPoint !== 'function') {
      return undefined;
    }

    const cell = document
      .elementsFromPoint(x, y)
      .map((element) => element.closest(CELL))
      .find((found) => found !== null && found.closest('.nui-table__viewport') === viewport);

    return cell === undefined || cell === null ? undefined : positionOf(cell);
  };

  const inView = computed<NuiTableWindow>((previous) => {
    const rows = options.rows.range.value;
    const cols = options.columns.range.value;

    const next = {
      rows: { start: rows.start, end: rows.end },
      cols: { start: startData.value + cols.start, end: startData.value + cols.end },
    };

    return previous !== undefined && sameWindow(previous, next) ? previous : next;
  });

  onMounted(() => {
    watch(inView, (next) => options.onWindow(next), { immediate: true });
  });

  return {
    scope: computed(() => ({ rectOf, window: inView.value })),
    planeStyle: computed(() => ({ '--_plane-lead': `${options.rows.frame.value.lead}px` })),
    rectOf,
    cellFromPoint,
  };
};
