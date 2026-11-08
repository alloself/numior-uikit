import { computed, onMounted, watch, type ComputedRef, type ShallowRef } from 'vue';
import { Direction, useEdgeScroll, type VirtualList } from '@numior/primitives';
import { boxOf } from './table-ranges';
import type { PlacedColumn, TableLayout } from './table-layout';
import {
  NuiTableOverlayPane,
  TableColumnKind,
  TablePaneName,
  type NuiTableOverlaySlot,
  type NuiTableRange,
  type NuiTableRect,
  type NuiTableWindow,
  type TableCellPosition,
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
  readonly frozenRows: () => number;
  readonly dataOffset: () => number;
  readonly expand: (range: NuiTableRange) => NuiTableRange;
  readonly onWindow: (window: NuiTableWindow) => void;
}

export interface TableOverlayPaneView {
  readonly name: NuiTableOverlayPane;
  readonly classes: readonly string[];
  readonly scope: NuiTableOverlaySlot;
}

export interface TableOverlay {
  readonly panes: ComputedRef<readonly TableOverlayPaneView[]>;
  readonly style: ComputedRef<Readonly<Record<string, string>>>;
  readonly planeBase: ComputedRef<number>;
  rectOf(range: NuiTableRange): NuiTableRect | undefined;
  cellFromPoint(x: number, y: number): TableCellPosition | undefined;
  cellNear(x: number, y: number): TableCellPosition | undefined;
  followEdge(x: number, y: number, onStep: () => void): void;
  stopEdge(): void;
}

interface OverlayZone {
  readonly name: NuiTableOverlayPane;
  readonly frozen: boolean;
  readonly cols: TablePaneName;
}

interface ColumnZones {
  readonly start: number;
  readonly end: number;
  readonly count: number;
}

interface DataBand {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

const CELL = '.nui-table__cell';
const PLANE_SPAN = 8_000_000;

const ZONES: readonly OverlayZone[] = [
  { name: NuiTableOverlayPane.Body, frozen: false, cols: TablePaneName.Centre },
  { name: NuiTableOverlayPane.Start, frozen: false, cols: TablePaneName.Start },
  { name: NuiTableOverlayPane.End, frozen: false, cols: TablePaneName.End },
  { name: NuiTableOverlayPane.Top, frozen: true, cols: TablePaneName.Centre },
  { name: NuiTableOverlayPane.TopStart, frozen: true, cols: TablePaneName.Start },
  { name: NuiTableOverlayPane.TopEnd, frozen: true, cols: TablePaneName.End },
];

const zoneClasses = (zone: OverlayZone): readonly string[] => [
  `nui-table__pane--${zone.name}`,
  ...(zone.frozen ? ['nui-table__pane--frozen'] : []),
  ...(zone.cols === TablePaneName.Centre ? [] : [`nui-table__pane--cols-${zone.cols}`]),
];

const holdsColumns = (zones: ColumnZones, pane: TablePaneName): boolean => {
  switch (pane) {
    case TablePaneName.Start:
      return zones.start > 0;
    case TablePaneName.Centre:
      return true;
    case TablePaneName.End:
      return zones.end > 0;
  }
};

const crossesColumns = (
  zones: ColumnZones,
  pane: TablePaneName,
  first: number,
  last: number,
): boolean => {
  switch (pane) {
    case TablePaneName.Start:
      return first < zones.start;
    case TablePaneName.Centre:
      return last >= zones.start && first < zones.count - zones.end;
    case TablePaneName.End:
      return last >= zones.count - zones.end;
  }
};

const paneBase = (layout: TableLayout, pane: TablePaneName): number => {
  switch (pane) {
    case TablePaneName.Start:
      return 0;
    case TablePaneName.Centre:
      return layout.startWidth;
    case TablePaneName.End:
      return layout.startWidth + layout.centreWidth;
  }
};

const sameWindow = (a: NuiTableWindow, b: NuiTableWindow): boolean =>
  a.rows.start === b.rows.start &&
  a.rows.end === b.rows.end &&
  a.cols.start === b.cols.start &&
  a.cols.end === b.cols.end;

const idle = (): void => undefined;

const clamp = (value: number, low: number, high: number): number =>
  Math.min(Math.max(value, low + 1), high - 1);

const ariaIndex = (element: Element | null | undefined, name: string): number =>
  Number(element?.getAttribute(name));

export const useTableOverlay = (options: TableOverlayOptions): TableOverlay => {
  const placed = computed(
    () => new Map(options.layout().visual.map((column) => [column.key, column])),
  );

  const startData = computed(() =>
    options
      .layout()
      .start.reduce((count, column) => count + Number(column.kind === TableColumnKind.Data), 0),
  );

  const endData = computed(() =>
    options
      .layout()
      .end.reduce((count, column) => count + Number(column.kind === TableColumnKind.Data), 0),
  );

  const columnOf = (col: number): PlacedColumn | undefined => {
    const key = options.dataKeys()[col];

    return key === undefined ? undefined : placed.value.get(key);
  };

  const edgeOf = (column: PlacedColumn): number =>
    paneBase(options.layout(), column.pane) + column.offset;

  const planeBase = computed(
    () => Math.floor(options.rows.windowOrigin.value / PLANE_SPAN) * PLANE_SPAN,
  );

  const rectIn = (range: NuiTableRange): NuiTableRect | undefined => {
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
      top: options.headSize() + rows.offsetOf(box.top) - planeBase.value,
      start: edgeOf(first),
      width: edgeOf(last) + last.width - edgeOf(first),
      height: rows.offsetOf(box.bottom + 1) - rows.offsetOf(box.top),
    };
  };

  const rectOf = (range: NuiTableRange): NuiTableRect | undefined => rectIn(options.expand(range));

  const columnZones = computed<ColumnZones>(() => ({
    start: startData.value,
    end: endData.value,
    count: options.dataKeys().length,
  }));

  const paneRect =
    (zone: OverlayZone, zones: ColumnZones, frozen: number) =>
    (range: NuiTableRange): NuiTableRect | undefined => {
      const full = options.expand(range);
      const box = boxOf(full);

      const rowsIn = zone.frozen ? box.top < frozen : box.bottom >= frozen;

      return rowsIn && crossesColumns(zones, zone.cols, box.start, box.end)
        ? rectIn(full)
        : undefined;
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

  const utilityWidth = (): number =>
    options
      .layout()
      .start.reduce(
        (width, column) => width + (column.kind === TableColumnKind.Data ? 0 : column.width),
        0,
      );

  const bandOf = (viewport: HTMLElement): DataBand => {
    const rect = viewport.getBoundingClientRect();
    const left = rect.left + viewport.clientLeft;
    const top = rect.top + viewport.clientTop;
    const rtl = getComputedStyle(viewport).direction === Direction.Rtl;
    const lead = utilityWidth();

    return {
      left: left + (rtl ? 0 : lead),
      right: left + viewport.clientWidth - (rtl ? lead : 0),
      top: top + options.headSize(),
      bottom:
        top +
        viewport.clientHeight -
        (viewport
          .querySelector(':scope > .nui-table__grid > .nui-table__footer')
          ?.getBoundingClientRect().height ?? 0),
    };
  };

  const cellNear = (x: number, y: number): TableCellPosition | undefined => {
    const viewport = options.viewport.value;

    if (viewport === null) {
      return undefined;
    }
    const band = bandOf(viewport);

    return cellFromPoint(clamp(x, band.left, band.right), clamp(y, band.top, band.bottom));
  };

  let edgeStep = idle;

  const edge = useEdgeScroll({
    container: options.viewport,
    onStep: () => {
      edgeStep();
    },
  });

  const followEdge = (x: number, y: number, onStep: () => void): void => {
    edgeStep = onStep;
    edge.follow({ x, y });
  };

  const stopEdge = (): void => {
    edgeStep = idle;
    edge.stop();
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

  const panes = computed((): readonly TableOverlayPaneView[] => {
    const zones = columnZones.value;
    const frozen = options.frozenRows();
    const window = inView.value;

    return ZONES.reduce<TableOverlayPaneView[]>((shown, zone) => {
      if ((frozen > 0 || !zone.frozen) && holdsColumns(zones, zone.cols)) {
        shown.push({
          name: zone.name,
          classes: zoneClasses(zone),
          scope: { rectOf: paneRect(zone, zones, frozen), window, pane: zone.name },
        });
      }
      return shown;
    }, []);
  });

  const style = computed(() => {
    const layout = options.layout();
    const lead = utilityWidth();

    return {
      '--_plane-lead': `${options.rows.windowOrigin.value - planeBase.value}px`,
      '--_pane-lead': `${lead}px`,
      '--_pane-start': `${layout.startWidth - lead}px`,
      '--_pane-end': `${layout.endWidth}px`,
      '--_pane-end-at': `${layout.startWidth + layout.centreWidth}px`,
    };
  });

  return {
    panes,
    style,
    planeBase,
    rectOf,
    cellFromPoint,
    cellNear,
    followEdge,
    stopEdge,
  };
};
