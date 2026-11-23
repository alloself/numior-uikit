import {
  computed,
  watch,
  type ComputedRef,
  type Ref,
  type ShallowRef,
  type WatchSource,
} from 'vue';
import { createEchoes } from '../table-echoes';
import { centreIndexOf } from '../table-layout';
import {
  anchorOf,
  consecutiveRuns,
  createMergeIndex,
  expandToMerges,
  keepSpans,
  leaveMerge,
  mergeSpans,
  pieceOf,
  type TableMergeIndex,
} from '../table-merges';
import {
  clampPosition,
  columnSpansOf,
  sameSpot,
  type RangeBox,
  type RangeSpan,
} from '../table-ranges';
import { useTableFocus, type TableFocus } from '../use-table-focus';
import { useTableRanges, type TableRanges } from '../use-table-ranges';
import {
  useTableSelection,
  type TableSelection,
  type TableSelectionKey,
} from '../use-table-selection';
import {
  TablePlacementKind,
  type NuiTableCellPosition,
  type NuiTableEdgeDirection,
  type NuiTableLastCell,
  type NuiTableNextEdge,
  type NuiTableRange,
  type NuiTableRanges,
  type NuiTableSelection,
  type TableBodyRow,
  type TableLeadSpan,
  type TableMergeLayout,
  type TableMergeSlot,
  type TableRevealAxis,
  type TableRowSpan,
} from '../table.types';
import type { TableContext } from './table-context';

export interface FocusAreaOptions<T> {
  readonly root: Readonly<ShallowRef<HTMLElement | null>>;
  readonly active: Ref<NuiTableCellPosition>;
  readonly activeCell: Ref<NuiTableCellPosition | undefined>;
  readonly ranges: Ref<NuiTableRanges>;
  readonly selected: Ref<readonly T[]>;
  readonly selectMode: () => NuiTableSelection | undefined;
  readonly keyOf: (row: T) => TableSelectionKey<T>;
  readonly cellSelection: () => boolean;
  readonly keep: () => ((target: Element) => boolean) | undefined;
  readonly rowHeads: () => boolean;
  readonly merges: () => readonly NuiTableRange[];
  readonly hierarchical: () => boolean;
  readonly nextEdge: () => NuiTableNextEdge | undefined;
  readonly lastCell: () => NuiTableLastCell | undefined;
  readonly footRows: () => number;
  readonly windowed: () => boolean;
  readonly pageRows: (body: number, forward: boolean) => number;
  readonly dataOffsets: () => readonly number[];
  readonly sortable: (key: string) => boolean;
  readonly reveal: (corner: NuiTableCellPosition, axis: TableRevealAxis) => void;
  readonly editing: () => boolean;
  readonly carry: (position: NuiTableCellPosition) => boolean;
  readonly resetOn: WatchSource[];
}

export interface FocusArea<T> {
  readonly focus: TableFocus;
  readonly selection: TableSelection<T>;
  readonly rangeSelect: TableRanges;
  readonly mergeIndex: ComputedRef<TableMergeIndex>;
  readonly coveredAt: (row: number, col: number) => boolean;
  readonly wholeRange: (range: NuiTableRange) => NuiTableRange;
  readonly spansOf: (item: TableBodyRow) => TableRowSpan | undefined;
  readonly allyOf: (item: TableBodyRow) => NuiTableCellPosition | undefined;
  readonly hostsCursor: (span: TableLeadSpan) => boolean;
  readonly dataCellOf: (visual: NuiTableCellPosition) => NuiTableCellPosition | undefined;
  readonly visualCellOf: (data: NuiTableCellPosition) => NuiTableCellPosition;
  readonly cellOfTarget: (target: EventTarget | null) => NuiTableCellPosition | undefined;
  readonly activeData: () => NuiTableCellPosition | undefined;
  readonly bodyActive: () => NuiTableCellPosition | undefined;
  readonly activeRowHead: () => number | undefined;
  readonly columnMarks: ComputedRef<RangeSpan[] | undefined>;
  readonly clampActive: () => void;
  readonly focusCellAt: (position: NuiTableCellPosition, scroll?: boolean) => boolean;
  readonly moveActiveCell: (position: NuiTableCellPosition) => boolean;
}

const NO_MERGE_INDEX = createMergeIndex([], { rows: 0, cols: 0 });

export const useFocusArea = <T>(table: TableContext<T>, own: FocusAreaOptions<T>): FocusArea<T> => {
  const { active } = own;
  const activeEchoes = createEchoes<NuiTableCellPosition | undefined>(sameSpot);

  const bounds = (): { rows: number; cols: number } => ({
    rows: table.bodyRows(),
    cols: table.dataKeys().length,
  });

  const focus = useTableFocus({
    viewport: table.viewport,
    active,
    rows: table.rowWindow(),
    columns: table.columnWindow(),
    merges: () => mergeIndex.value,
    rowCount: () => table.pinnedRows() + table.bodyRows() + own.footRows(),
    bodyRows: table.bodyRows,
    pinnedRows: table.pinnedRows,
    headRows: table.headRows,
    colCount: () => table.layout().visual.length,
    firstCol: table.dataOffset,
    pageRows: (row, forward) => own.pageRows(row - table.pinnedRows(), forward),
    centreIndexOf: (visual) => centreIndexOf(table.layout(), visual),
    columnIndexOf: (key) => table.layout().visual.findIndex((column) => column.key === key),
    isRtl: table.isRtl,
    windowed: own.windowed,
    lead: () => activeLead.value,
    settle: (focused) => settleFocus(focused),
    leave: (from, key) => leaveFrom(from, key),
    edge: (from, toward) => {
      const data = dataCellOf(from);
      const target = data === undefined ? undefined : edgeOfData(data, toward);

      return target === undefined ? undefined : visualCellOf(target);
    },
    last: () => {
      const target = lastOfData();

      return target === undefined ? undefined : visualCellOf(target);
    },
  });

  const selection = useTableSelection<T>({
    mode: own.selectMode,
    selected: own.selected,
    keyOf: own.keyOf,
    engine: table.engine,
    revision: table.revision,
    scope: () => ({ start: table.pageStart(), end: table.pageStart() + table.bodyRows() }),
    disabled: table.loading,
    selectKeyAt: (visual) => table.layout().visual[visual]?.kind === TablePlacementKind.Select,
  });

  const mergeIndex = computed(() => {
    const merges = own.merges();

    return merges.length > 0 && !own.hierarchical() && !table.loading()
      ? createMergeIndex(merges, bounds())
      : NO_MERGE_INDEX;
  });

  const coveredAt = (row: number, col: number): boolean => {
    const merge = mergeIndex.value.at(row, col);

    return merge !== undefined && (merge.top !== row || merge.start !== col);
  };

  const wholeRange = (range: NuiTableRange): NuiTableRange =>
    expandToMerges(mergeIndex.value, range, bounds());

  const mergeSlots = computed((): TableMergeSlot[] =>
    table.rowCells().cells.map((cell) => ({
      key: cell.key,
      pane: cell.pin ?? 'centre',
      col:
        cell.kind === TablePlacementKind.Data ? cell.colIndex - 1 - table.dataOffset() : undefined,
      edge: cell.edge,
      tail: cell.kind !== TablePlacementKind.Gap && cell.tail === true,
    })),
  );

  const mergeLayout = computed<TableMergeLayout<RangeBox> | undefined>((previous) => {
    const index = mergeIndex.value;

    if (index.size === 0) {
      return undefined;
    }

    const rowWindow = table.rowWindow();

    const runs = consecutiveRuns(
      rowWindow.items.value.map((item) => item.index),
      table.frozenRows(),
    );

    const found = new Set(runs.flatMap((run) => index.within(run[0] ?? 0, run.at(-1) ?? 0)));

    const next = mergeSpans([...found], runs, mergeSlots.value, {
      rowOffset: (row) => rowWindow.offsetOf(row),
      colOffset: (col) => own.dataOffsets()[col] ?? 0,
    });

    return { spans: keepSpans(next.spans, previous?.spans), pieces: next.pieces };
  });

  const spansOf = (item: TableBodyRow): TableRowSpan | undefined =>
    mergeLayout.value?.spans.get(item.index);

  const dataCellOf = (visual: NuiTableCellPosition): NuiTableCellPosition | undefined => {
    const row = visual.row - table.pinnedRows();
    const col = visual.col - table.dataOffset();

    return row >= 0 && row < table.bodyRows() && col >= 0 && col < table.dataKeys().length
      ? { row, col }
      : undefined;
  };

  const visualCellOf = (data: NuiTableCellPosition): NuiTableCellPosition => ({
    row: data.row + table.pinnedRows(),
    col: data.col + table.dataOffset(),
  });

  const edgeOfData = (
    from: NuiTableCellPosition,
    toward: NuiTableEdgeDirection,
  ): NuiTableCellPosition | undefined => {
    const nextEdge = own.nextEdge();

    return nextEdge === undefined ? undefined : clampPosition(nextEdge(from, toward), bounds());
  };

  const lastOfData = (): NuiTableCellPosition | undefined => {
    const last = own.lastCell()?.();

    return last === undefined ? undefined : clampPosition(last, bounds());
  };

  const activeMerge = computed(() => {
    const data = mergeIndex.value.size === 0 ? undefined : dataCellOf(active.value);

    return data === undefined ? undefined : mergeIndex.value.at(data.row, data.col);
  });

  const activeAnchor = computed((): NuiTableCellPosition | undefined => {
    const merge = activeMerge.value;

    return merge === undefined ? undefined : { row: merge.top, col: merge.start };
  });

  const allyOf = (item: TableBodyRow): NuiTableCellPosition | undefined => {
    const merge = activeMerge.value;

    return merge !== undefined && item.index >= merge.top && item.index <= merge.bottom
      ? activeAnchor.value
      : undefined;
  };

  const activeLead = computed((): NuiTableCellPosition => {
    const current = active.value;
    const merge = activeMerge.value;
    const data = merge === undefined ? undefined : dataCellOf(current);

    const piece =
      merge === undefined || data === undefined
        ? undefined
        : pieceOf(mergeLayout.value?.pieces.get(merge), data);

    return piece === undefined ? current : visualCellOf({ row: piece.top, col: piece.start });
  });

  const hostsCursor = (span: TableLeadSpan): boolean => {
    const lead = activeLead.value;
    const piece = visualCellOf({ row: span.row, col: span.col });

    return lead.row === piece.row && lead.col === piece.col;
  };

  const settleFocus = (focused: NuiTableCellPosition): NuiTableCellPosition => {
    const lead = activeLead.value;

    return focused.row === lead.row && focused.col === lead.col ? active.value : focused;
  };

  const leaveFrom = (from: NuiTableCellPosition, key: string): NuiTableCellPosition => {
    const data = mergeIndex.value.size === 0 ? undefined : dataCellOf(from);

    return data === undefined
      ? from
      : visualCellOf(leaveMerge(mergeIndex.value, data, key, table.isRtl()));
  };

  const cellOfTarget = (target: EventTarget | null): NuiTableCellPosition | undefined => {
    const cell = rangeSelect.cellAt(target);

    return cell === undefined ? undefined : anchorOf(mergeIndex.value, cell);
  };

  const bodyActive = (): NuiTableCellPosition | undefined => {
    const row = active.value.row - table.pinnedRows();
    return row >= 0 && row < table.bodyRows() ? { row, col: active.value.col } : undefined;
  };

  const activeRowHead = (): number | undefined =>
    table.layout().visual[active.value.col]?.kind === TablePlacementKind.Rowhead
      ? bodyActive()?.row
      : undefined;

  const activeData = (): NuiTableCellPosition | undefined => {
    const body = bodyActive();
    const col = body === undefined ? -1 : body.col - table.dataOffset();

    return body !== undefined && col >= 0 && col < table.dataKeys().length
      ? anchorOf(mergeIndex.value, { row: body.row, col })
      : undefined;
  };

  const shownActive = computed<NuiTableCellPosition | undefined>((previous) => {
    const next = activeData();

    return sameSpot(next, previous) ? previous : next;
  });

  const rangeAnchor = (): NuiTableCellPosition | undefined =>
    table.viewport.value?.contains(document.activeElement) === true ? activeData() : undefined;

  const columnMarks = computed(() =>
    own.rowHeads() ? columnSpansOf(own.ranges.value, table.dataOffset()) : undefined,
  );

  const rangeSelect = useTableRanges({
    enabled: () => own.cellSelection() && !table.loading(),
    lines: own.rowHeads,
    ranges: own.ranges,
    viewport: () => table.viewport.value,
    inside: (target) =>
      own.root.value?.contains(target) === true ||
      (target instanceof Element && own.keep()?.(target) === true),
    bounds,
    offset: table.dataOffset,
    headRows: table.headRows,
    pinnedRows: table.pinnedRows,
    footRows: own.footRows,
    rowSize: table.rowSize,
    pageRows: own.pageRows,
    isRtl: table.isRtl,
    anchor: rangeAnchor,
    cursor: () => activeData(),
    sorts: (col) => own.sortable(table.dataKeys()[col] ?? ''),
    merges: () => mergeIndex.value,
    edge: edgeOfData,
    last: lastOfData,
    focus: (position) => {
      focus.focusCell(visualCellOf(position), false);
    },
    reveal: own.reveal,
    resetOn: own.resetOn,
    messages: table.messages,
    announce: table.announce,
  });

  const clampActive = (): void => {
    const rowsInFocus = table.bodyRows() + own.footRows();
    const lastRow = rowsInFocus > 0 ? rowsInFocus - 1 : -1;
    const lastCol = Math.max(0, table.layout().visual.length - 1);
    const row = Math.min(active.value.row, lastRow);
    const col = Math.min(active.value.col, lastCol);

    if (row === active.value.row && col === active.value.col) {
      return;
    }

    active.value = { row, col };
  };

  const inBody = (position: NuiTableCellPosition): boolean =>
    position.row >= 0 &&
    position.row < table.bodyRows() &&
    position.col >= 0 &&
    position.col < table.dataKeys().length;

  const moveActiveTo = (position: NuiTableCellPosition): boolean => {
    if (!inBody(position)) {
      return false;
    }
    const target = visualCellOf(anchorOf(mergeIndex.value, position));

    if (table.viewport.value?.contains(document.activeElement) === true) {
      focus.focusCell(target);
    } else {
      active.value = target;

      if (table.viewport.value !== null) {
        focus.reveal(target);
      }
    }
    return true;
  };

  const focusCellAt = (position: NuiTableCellPosition, scroll = true): boolean => {
    if (!inBody(position)) {
      return false;
    }
    focus.focusCell(visualCellOf(anchorOf(mergeIndex.value, position)), scroll);
    return true;
  };

  const moveActiveCell = (position: NuiTableCellPosition): boolean => {
    if (!inBody(position)) {
      return false;
    }
    const target = visualCellOf(position);

    if (own.editing()) {
      if (!own.carry(position)) {
        return false;
      }
      active.value = target;
      focus.reveal(target);
      return true;
    }
    if (table.viewport.value?.contains(document.activeElement) === true) {
      focus.focusCell(target, false);
    } else {
      active.value = target;
    }
    return true;
  };

  const shareActive = (next: NuiTableCellPosition | undefined): void => {
    activeEchoes.sent(next);
    own.activeCell.value = next;
  };

  watch(
    own.activeCell,
    (next) => {
      if (
        activeEchoes.echoed(next) ||
        next === undefined ||
        sameSpot(next, shownActive.value) ||
        moveActiveTo(next)
      ) {
        return;
      }
      shareActive(shownActive.value);
    },
    { immediate: true },
  );

  watch(shownActive, shareActive, { immediate: true });

  watch(table.bodyRows, clampActive);

  watch(
    table.layout,
    (next, previous) => {
      const key = previous.visual[active.value.col]?.key;
      const index = key === undefined ? -1 : next.visual.findIndex((column) => column.key === key);

      const col =
        index >= 0 ? index : Math.min(active.value.col, Math.max(0, next.visual.length - 1));

      if (col === active.value.col) {
        return;
      }

      active.value = { ...active.value, col };
    },
    { flush: 'sync' },
  );

  return {
    focus,
    selection,
    rangeSelect,
    mergeIndex,
    coveredAt,
    wholeRange,
    spansOf,
    allyOf,
    hostsCursor,
    dataCellOf,
    visualCellOf,
    cellOfTarget,
    activeData,
    bodyActive,
    activeRowHead,
    columnMarks,
    clampActive,
    focusCellAt,
    moveActiveCell,
  };
};
