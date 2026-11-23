import { computed, type ComputedRef, type WatchSource, watch } from 'vue';
import { clamp } from '@vueuse/core';
import {
  createIntent,
  ReorderAxis,
  useVirtualFrame,
  useVirtualList,
  type VersionRead,
  type VirtualFrame,
  type VirtualFrameStyles,
  type VirtualList,
} from '@numior/primitives';
import { ownCellAt } from '../table-dom';
import { pageRowsOf, pageStepOf } from '../table-keys';
import {
  centreIndexOf,
  mergeIndices,
  revealOffset,
  sameIndices,
  wrappedCentreOf,
} from '../table-layout';
import { useTableRowSizes, type TableRowSizes } from '../use-table-row-sizes';
import {
  NuiTableRowHeight,
  TablePaneName,
  TableRevealAxis,
  TableRowMode,
  type NuiTableCellPosition,
  type NuiTableRowHeights,
  type NuiTableScrollAnchor,
  type NuiTableSize,
  type TableDetailSpot,
  type TableReveal,
} from '../table.types';
import type { TableContext } from './table-context';

export interface WindowsAreaOptions {
  readonly size: () => NuiTableSize;
  readonly rowHeight: () => number | typeof NuiTableRowHeight.Auto | undefined;
  readonly height: () => string | undefined;
  readonly frozen: () => number;
  readonly sourced: () => boolean;
  readonly hierarchical: () => boolean;
  readonly measured: () => boolean;
  readonly heights: () => NuiTableRowHeights;
  readonly spots: () => readonly TableDetailSpot[];
  readonly arrangement: VersionRead;
  readonly rendered: WatchSource;
  readonly footRows: () => number;
  readonly loadingRows: () => number | undefined;
  readonly loadingSlot: () => boolean;
  readonly revealCell: (target: NuiTableCellPosition, axis: TableRevealAxis) => void;
}

export interface WindowsArea {
  readonly rowSize: ComputedRef<number>;
  readonly rowMode: ComputedRef<TableRowMode>;
  readonly windowed: ComputedRef<boolean>;
  readonly fluid: ComputedRef<boolean>;
  readonly frozenCount: ComputedRef<number>;
  readonly rowSizes: TableRowSizes;
  readonly rowWindow: VirtualList;
  readonly columnWindow: VirtualList;
  readonly frozenSize: ComputedRef<number>;
  readonly shownCentre: ComputedRef<readonly number[]>;
  readonly pageRows: (body: number, forward: boolean) => number;
  readonly skeletonCount: ComputedRef<number>;
  readonly windowFrame: VirtualFrameStyles;
  readonly scrollAnchor: () => NuiTableScrollAnchor | undefined;
  readonly scrollToAnchor: (anchor: NuiTableScrollAnchor) => void;
  readonly onViewportScroll: () => void;
  readonly revealCorner: (corner: NuiTableCellPosition, axis: TableRevealAxis) => void;
}

const ROW_SIZES = { sm: 32, md: 40, lg: 48 } as const;
const CANVAS_LIMIT = 15_000_000;
const STILL_FRAME: VirtualFrame = { lead: 0, rest: 0, clampStart: 0, clampEnd: 0 };
const NO_COLUMNS: readonly number[] = [];
const INITIAL_ROWS = 30;
const INITIAL_COLUMNS = 12;
const ROW_OVERSCAN = 6;
const COLUMN_OVERSCAN = 2;
const SKELETON_ROWS = 5;

export const useWindowsArea = <T>(table: TableContext<T>, own: WindowsAreaOptions): WindowsArea => {
  const rowSize = computed(() => {
    const rowHeight = own.rowHeight();

    return typeof rowHeight === 'number' ? rowHeight : ROW_SIZES[own.size()];
  });

  const rowMode = computed<TableRowMode>(() => {
    if (own.height() === undefined) {
      return 'flow';
    }
    return own.rowHeight() === NuiTableRowHeight.Auto ? TableRowMode.Fluid : TableRowMode.Fixed;
  });

  const windowed = computed(() => rowMode.value !== TableRowMode.Flow);
  const fluid = computed(() => rowMode.value === TableRowMode.Fluid);

  const frozenCount = computed(() =>
    windowed.value && !own.hierarchical() && !table.loading() && !own.sourced()
      ? clamp(Math.floor(own.frozen()) || 0, 0, table.bodyRows())
      : 0,
  );

  const rowSizes = useTableRowSizes({
    viewport: table.viewport,
    engine: table.engine,
    mode: () => rowMode.value,
    measured: own.measured,
    rowSize: () => rowSize.value,
    count: table.bodyRows,
    pageStart: table.pageStart,
    leading: () => table.headRows() + table.pinnedRows(),
    pinned: table.pinnedRows,
    spots: own.spots,
    heights: own.heights,
    arrangement: own.arrangement,
    rendered: own.rendered,
    resize: (sizes) => {
      rowWindow.resize(sizes);
    },
  });

  const activeRow = (): number | undefined => {
    const body = table.active().row - table.pinnedRows();
    return body >= 0 && body < table.bodyRows() ? body : undefined;
  };

  const activeCentre = (): number | undefined => centreIndexOf(table.layout(), table.active().col);

  const rowWindow = useVirtualList(table.viewport, {
    enabled: windowed,
    count: table.bodyRows,
    itemSize: rowSizes.itemSize,
    overscan: ROW_OVERSCAN,
    initialCount: INITIAL_ROWS,
    pinned: activeRow,
    frozen: frozenCount,
    maxSize: CANVAS_LIMIT,
    inset: () => rowSize.value * (table.headRows() + own.footRows()) + rowSizes.pinnedSize.value,
    listen: false,
  });

  const frozenSize = computed(() => rowWindow.offsetOf(frozenCount.value));

  const centreWidths = computed(() => table.layout().centre.map((column) => column.width));

  const columnWindow = useVirtualList(table.viewport, {
    enabled: windowed,
    axis: ReorderAxis.X,
    count: () => table.layout().centre.length,
    itemSize: () => {
      const sizes = centreWidths.value;
      return (index: number) => sizes[index] ?? 0;
    },
    overscan: COLUMN_OVERSCAN,
    initialCount: INITIAL_COLUMNS,
    pinned: activeCentre,
    inset: () => table.layout().startWidth + table.layout().endWidth,
    listen: false,
  });

  const scrollAnchor = (): NuiTableScrollAnchor | undefined => {
    if (!windowed.value) {
      return undefined;
    }

    const top = rowWindow.anchor();
    const start = columnWindow.anchor();
    const layout = table.layout();
    const centred = layout.centre.length > 0;

    return {
      row: top.index + table.pinnedRows(),
      rowOffset: top.within,
      col: centred ? start.index + layout.start.length : undefined,
      colOffset: centred ? start.within : 0,
    };
  };

  const scrollToAnchor = (anchor: NuiTableScrollAnchor): void => {
    if (!windowed.value) {
      return;
    }

    const body = anchor.row - table.pinnedRows();
    const centre = anchor.col === undefined ? undefined : centreIndexOf(table.layout(), anchor.col);

    if (body >= 0 && body < table.bodyRows()) {
      rowWindow.scrollToAnchor({ index: body, within: anchor.rowOffset });
    }
    if (centre === undefined) {
      return;
    }

    columnWindow.scrollToAnchor({ index: centre, within: anchor.colOffset });
  };

  const onViewportScroll = (): void => {
    if (!windowed.value) {
      return;
    }

    rowWindow.measure();
    columnWindow.measure();
  };

  const wrappedCentre = computed(() =>
    fluid.value ? wrappedCentreOf(table.layout()) : NO_COLUMNS,
  );

  const shownCentre = computed<readonly number[]>((previous) => {
    const shown = columnWindow.items.value.map((item) => item.index);
    const kept = wrappedCentre.value;
    const next = kept.length === 0 ? shown : mergeIndices(shown, kept);

    return previous !== undefined && sameIndices(previous, next) ? previous : next;
  });

  const bodySpan = computed(() =>
    Math.max(
      0,
      rowWindow.viewport.value -
        rowSize.value * (table.headRows() + own.footRows()) -
        rowSizes.pinnedSize.value -
        frozenSize.value,
    ),
  );

  const fittingRows = computed(() => Math.ceil(bodySpan.value / rowSize.value));

  const pagesByCount = (body: number): boolean =>
    body < 0 ||
    body >= table.bodyRows() ||
    !windowed.value ||
    typeof rowSizes.itemSize.value === 'number';

  const offsetOf = (row: number): number => rowWindow.offsetOf(row);

  const indexAt = (offset: number): number => rowWindow.indexAt(offset);

  const pageRows = (body: number, forward: boolean): number =>
    pagesByCount(body)
      ? pageRowsOf(rowWindow.viewport.value > 0 ? bodySpan.value : undefined, rowSize.value)
      : pageStepOf({ span: bodySpan.value, offsetOf, indexAt }, body, forward);

  const skeletonCount = computed(() => {
    if (!table.loading() || own.loadingSlot()) {
      return 0;
    }
    return (
      own.loadingRows() ??
      (windowed.value ? Math.max(SKELETON_ROWS, fittingRows.value) : SKELETON_ROWS)
    );
  });

  const windowFrame = useVirtualFrame(table.viewport, () => {
    if (!windowed.value) {
      return undefined;
    }
    return table.loading() ? STILL_FRAME : rowWindow.frame.value;
  });

  const revealed = createIntent<TableReveal>();

  const revealCorner = (corner: NuiTableCellPosition, axis: TableRevealAxis): void => {
    const target = {
      row: corner.row + table.pinnedRows(),
      col: corner.col + table.dataOffset(),
    };

    if (windowed.value) {
      own.revealCell(target, axis);
    } else {
      revealed.set({ target, axis });
    }
  };

  const revealColumnInFlow = (visual: number): void => {
    const element = table.viewport.value;
    const layout = table.layout();
    const placed = layout.visual[visual];

    if (element === null || placed?.pane !== TablePaneName.Centre) {
      return;
    }
    const span = element.clientWidth - layout.startWidth - layout.endWidth;
    const current = Math.abs(element.scrollLeft);
    const next = revealOffset(current, placed.offset, placed.width, span);

    if (next === current) {
      return;
    }

    element.scrollLeft = table.isRtl() ? -next : next;
  };

  const revealInFlow = ({ target, axis }: TableReveal): void => {
    const cell = table.viewport.value?.querySelector(
      ownCellAt(target.row + table.headRows() + 1, target.col + 1),
    );

    switch (axis) {
      case TableRevealAxis.Both:
        cell?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
        break;
      case TableRevealAxis.Row:
        cell?.parentElement?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
        break;
      case TableRevealAxis.Col:
        revealColumnInFlow(target.col);
        break;
      case TableRevealAxis.None:
        break;
    }
  };

  watch(
    table.ranges,
    () => {
      const pending = revealed.take();

      if (pending === undefined) {
        return;
      }

      revealInFlow(pending);
    },
    { flush: 'post' },
  );

  return {
    rowSize,
    rowMode,
    windowed,
    fluid,
    frozenCount,
    rowSizes,
    rowWindow,
    columnWindow,
    frozenSize,
    shownCentre,
    pageRows,
    skeletonCount,
    windowFrame,
    scrollAnchor,
    scrollToAnchor,
    onViewportScroll,
    revealCorner,
  };
};
