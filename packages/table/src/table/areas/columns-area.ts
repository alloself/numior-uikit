import { computed, onMounted, shallowRef, watch, type ComputedRef, type Ref } from 'vue';
import { useDevicePixelRatio, useResizeObserver } from '@vueuse/core';
import { headerBandsOf, type ColumnTree, type HeaderBands } from '../table-columns';
import { headFrameOf, headToolsOf, leastWidthOf } from '../table-head-tools';
import {
  dataKeysOf,
  pinsFit,
  rowCellsOf,
  rowHeadWidth,
  tableLayout,
  type TableLayout,
} from '../table-layout';
import { keepEqual } from '../table-values';
import { useTableColumnOrder, type TableColumnOrder } from '../use-table-column-order';
import { useTableResize, type TableResize } from '../use-table-resize';
import {
  TablePlacementKind,
  type NuiTableColumn,
  type NuiTableColumnOrder,
  type NuiTableFilters,
  type NuiTableHidden,
  type NuiTablePins,
  type NuiTableRowHeaders,
  type NuiTableSize,
  type NuiTableSort,
  type NuiTableWidths,
  type TableRowCells,
} from '../table.types';
import type { TableContext } from './table-context';

export interface ColumnsAreaOptions<T> {
  readonly root: Readonly<Ref<HTMLElement | null>>;
  readonly tree: () => ColumnTree<T>;
  readonly ordered: () => readonly NuiTableColumn<T>[];
  readonly widths: Ref<NuiTableWidths>;
  readonly order: Ref<NuiTableColumnOrder>;
  readonly pins: Ref<NuiTablePins>;
  readonly hidden: Ref<NuiTableHidden>;
  readonly sorting: () => NuiTableSort;
  readonly filters: () => NuiTableFilters;
  readonly menu: () => boolean;
  readonly opened: () => string | undefined;
  readonly size: () => NuiTableSize;
  readonly gridlines: () => boolean;
  readonly selectable: () => boolean;
  readonly wrap: () => boolean;
  readonly rowHead: () => NuiTableRowHeaders<T> | undefined;
  readonly totalCount: () => number;
  readonly shown: () => readonly number[];
  readonly focusHeader: (key: string) => void;
}

export interface ColumnsArea<T> {
  readonly layout: ComputedRef<TableLayout>;
  readonly headRows: ComputedRef<number>;
  readonly columnAt: (key: string) => NuiTableColumn<T>;
  readonly dataKeys: ComputedRef<readonly string[]>;
  readonly dataOffset: ComputedRef<number>;
  readonly dataOffsets: ComputedRef<readonly number[]>;
  readonly rowCells: ComputedRef<TableRowCells>;
  readonly bands: ComputedRef<HeaderBands>;
  readonly slack: ComputedRef<boolean>;
  readonly resize: TableResize;
  readonly fitColumn: (key: string) => void;
  readonly order: TableColumnOrder;
}

export const useColumnsArea = <T>(
  table: TableContext<T>,
  own: ColumnsAreaOptions<T>,
): ColumnsArea<T> => {
  const leastWidths = computed<Readonly<Record<string, number>>>((previous) => {
    const headFrame = headFrameOf(own.size(), own.gridlines());

    const facts = {
      sort: own.sorting(),
      filters: own.filters(),
      pins: own.pins.value,
      menu: own.menu(),
      opened: own.opened(),
    };

    const next = Object.fromEntries(
      own
        .ordered()
        .map((column) => [column.key, leastWidthOf(headToolsOf(column, facts), headFrame)]),
    );

    return keepEqual(next, previous);
  });

  const rowHeadSize = computed(() => {
    const rowHead = own.rowHead();

    return rowHead === undefined ? 0 : rowHeadWidth(own.totalCount(), rowHead.width);
  });

  const room = shallowRef(0);

  const measureRoom = (): void => {
    room.value = table.viewport.value?.clientWidth ?? 0;
  };

  useResizeObserver(table.viewport, measureRoom);
  onMounted(measureRoom);
  const { pixelRatio } = useDevicePixelRatio();
  const scale = shallowRef(1);

  onMounted(() => {
    watch(
      pixelRatio,
      (ratio) => {
        scale.value = ratio;
      },
      { immediate: true },
    );
  });

  const flexing = computed(() =>
    own.ordered().some((column) => (column.flex ?? 0) > 0 && !(column.key in own.widths.value)),
  );

  const layoutOptions = computed(() => ({
    pins: own.pins.value,
    hidden: own.hidden.value,
    widths: own.widths.value,
    least: leastWidths.value,
    select: own.selectable(),
    room: flexing.value ? room.value : 0,
    wrap: own.wrap(),
    rowHeader: rowHeadSize.value,
    scale: scale.value,
  }));

  const pinnedLayout = computed(() =>
    tableLayout(own.ordered(), { ...layoutOptions.value, sticky: true }),
  );

  const sticky = computed(() => pinsFit(pinnedLayout.value, room.value));

  const layout = computed(() =>
    sticky.value
      ? pinnedLayout.value
      : tableLayout(own.ordered(), { ...layoutOptions.value, sticky: false }),
  );

  const headRows = computed(() => own.tree().depth + 1);

  const columnByKey = computed(
    () => new Map(own.tree().leaves.map((column) => [column.key, column])),
  );

  const columnAt = (key: string): NuiTableColumn<T> => {
    const column = columnByKey.value.get(key);

    if (column === undefined) {
      throw new Error(`NuiTable has no column "${key}"`);
    }
    return column;
  };

  const dataKeys = computed(() => dataKeysOf(layout.value));

  const dataOffset = computed(() =>
    Math.max(
      0,
      layout.value.visual.findIndex((column) => column.kind === TablePlacementKind.Data),
    ),
  );

  const dataOffsets = computed(() => {
    const offsets = [0];

    for (const column of layout.value.visual) {
      if (column.kind !== TablePlacementKind.Data) {
        continue;
      }

      offsets.push((offsets.at(-1) ?? 0) + column.width);
    }
    return offsets;
  });

  const rowCells = computed(() => rowCellsOf(layout.value, own.shown()));

  const bands = computed(() => headerBandsOf(layout.value, own.tree(), rowCells.value));

  const slack = computed(() => room.value > layout.value.canvasWidth);

  watch(
    room,
    (width) => {
      if (width > 0) {
        own.root.value?.style.setProperty('--_room', `${width}px`);
      } else {
        own.root.value?.style.removeProperty('--_room');
      }
    },
    { flush: 'post' },
  );

  const resize = useTableResize<T>({
    widths: own.widths,
    layout: () => layout.value,
    room: () => room.value,
    columnAt,
    leastOf: (key) => leastWidths.value[key] ?? 0,
    isRtl: table.isRtl,
    messages: table.messages,
    announce: table.announce,
    resized: (changes) => {
      table.emit('columnResize', changes);
    },
  });

  const fitColumn = (key: string): void => {
    let taken = false;

    table.emit('columnFit', {
      key,
      preventDefault: () => {
        taken = true;
      },
    });

    if (taken) {
      return;
    }

    resize.reset(key);
  };

  const order = useTableColumnOrder<T>({
    order: own.order,
    leaves: () => own.tree().leaves,
    layout: () => layout.value,
    viewport: () => table.viewport.value,
    frame: () => table.frame.value,
    columnAt,
    isRtl: table.isRtl,
    messages: table.messages,
    announce: table.announce,
    refocus: own.focusHeader,
  });

  return {
    layout,
    headRows,
    columnAt,
    dataKeys,
    dataOffset,
    dataOffsets,
    rowCells,
    bands,
    slack,
    resize,
    fitColumn,
    order,
  };
};
