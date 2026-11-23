import { computed, type ComputedRef } from 'vue';
import {
  alignOfCell,
  closingLineOf,
  spillClasses,
  spillStyleOf,
  spillsOf,
  type TableFloodLine,
  type TableFloodRun,
  type TableFloodView,
  type TableSpill,
} from '../table-flood';
import type { TableMergeIndex } from '../table-merges';
import { paintOf } from '../table-paint';
import type { TextMeasure } from '../use-text-measure';
import {
  TableCellSpanKind,
  TablePaneName,
  TablePlacementKind,
  type NuiTableCellStyler,
  type TableCellLayout,
  type TableCellPaint,
  type TableCellSpan,
  type TableRowPaint,
  type TableRowPainter,
  type TableRowSpan,
  type TableSpillCover,
} from '../table.types';
import type { TableContext } from './table-context';

export interface PaintAreaOptions<T> {
  readonly cellStyle: () => NuiTableCellStyler<T> | undefined;
  readonly pinned: () => readonly T[];
  readonly merges: () => TableMergeIndex;
  readonly plainText: (row: T, position: number, key: string) => string | undefined;
  readonly measure: TextMeasure;
}

export interface PaintArea {
  readonly bodyPaint: ComputedRef<TableRowPainter | undefined>;
  readonly pinnedPaint: ComputedRef<TableRowPainter | undefined>;
}

const spilledPaint = (
  base: TableCellPaint | undefined,
  spill: TableSpill,
  closing: string | undefined,
  covered: TableSpillCover | undefined,
): TableCellPaint => ({
  class: [...(base?.class ?? []), ...spillClasses(spill)],
  style: {
    ...base?.style,
    ...covered?.style,
    '--_spill': `${spill.shift}px`,
    ...(closing === undefined ? {} : { '--_spill-line': closing }),
  },
  align: spill.align,
  overflow: base?.overflow ?? false,
  spill: covered?.text,
  flows: true,
});

export const usePaintArea = <T>(table: TableContext<T>, own: PaintAreaOptions<T>): PaintArea => {
  const paintedKeys = computed(() =>
    table
      .rowCells()
      .cells.flatMap((cell) => (cell.kind === TablePlacementKind.Data ? [cell.key] : [])),
  );

  const paintedKeySet = computed(() => new Set(paintedKeys.value));

  const dataColumns = computed(() =>
    table.layout().visual.filter((column) => column.kind === TablePlacementKind.Data),
  );

  const paintCell = (
    row: T,
    key: string,
    position: number,
    pinned: boolean,
  ): TableCellPaint | undefined =>
    paintOf(own.cellStyle()?.({ row, column: table.columnAt(key), position, pinned }));

  const paintSpan = (span: TableCellSpan): TableCellPaint | undefined => {
    if (span.kind === TableCellSpanKind.Covered) {
      return undefined;
    }
    const row = table.rowAtPosition(span.anchor.row);
    const key = table.dataKeys()[span.anchor.col];

    return row === undefined || key === undefined
      ? undefined
      : paintCell(row, key, span.anchor.row, false);
  };

  const runsOf = (cells: readonly TableCellLayout[]): TableFloodRun[] => {
    const runs = new Map<TablePaneName, TableFloodRun>();
    const offset = table.dataOffset();

    for (const cell of cells) {
      if (cell.kind !== TablePlacementKind.Data) {
        continue;
      }

      const col = cell.colIndex - 1 - offset;
      const pane = cell.pin ?? TablePaneName.Centre;
      const run = runs.get(pane);

      runs.set(pane, {
        pane,
        first: Math.min(run?.first ?? col, col),
        last: Math.max(run?.last ?? col, col),
      });
    }
    return [...runs.values()];
  };

  const floodLineOf = (
    row: T,
    position: number,
    painted: TableRowPaint,
    pinned: boolean,
  ): TableFloodView => {
    const data = dataColumns.value;
    const merged = own.merges();
    const shown = paintedKeySet.value;
    const asked = new Map<number, TableCellPaint | undefined>();

    const paintAt = (col: number): TableCellPaint | undefined => {
      const key = data[col]?.key;

      if (key === undefined || shown.has(key)) {
        return key === undefined ? undefined : painted.get(key);
      }
      if (!asked.has(col)) {
        asked.set(col, paintCell(row, key, position, pinned));
      }
      return asked.get(col);
    };

    const textAt = (col: number): string | undefined => {
      const key = data[col]?.key;

      return key === undefined || (merged.size > 0 && merged.at(position, col) !== undefined)
        ? undefined
        : own.plainText(row, position, key);
    };

    const line: TableFloodLine = {
      count: data.length,
      paneAt: (col) => data[col]?.pane,
      widthAt: (col) => data[col]?.width ?? 0,
      textAt,
      alignAt: (col) => {
        const paint = paintAt(col);
        const column = data[col];

        return paint?.overflow === true && column !== undefined
          ? (paint.align ?? alignOfCell(column.cell))
          : undefined;
      },
      needAt: (col) => own.measure.needOf(textAt(col) ?? '', paintAt(col)?.style),
    };

    return { line, paintAt };
  };

  const floodPaints = (
    row: T,
    position: number,
    painted: Map<string, TableCellPaint>,
    pinned: boolean,
  ): TableRowPaint => {
    const cells = table.rowCells().cells;
    const { line, paintAt } = floodLineOf(row, position, painted, pinned);
    const spills = spillsOf(line, runsOf(cells));

    if (spills.size === 0) {
      return painted;
    }
    const lastKey = cells.at(-1)?.key;
    const offset = table.dataOffset();

    const closingOf = (origin: number): string | undefined => {
      const column = dataColumns.value[origin];

      return spills.get(origin)?.seam === false
        ? closingLineOf(column?.cell, column?.key === lastKey)
        : undefined;
    };

    for (const cell of cells) {
      const col = cell.kind === TablePlacementKind.Data ? cell.colIndex - 1 - offset : -1;
      const spill = spills.get(col);

      if (spill === undefined) {
        continue;
      }

      const covered =
        spill.origin === col
          ? undefined
          : {
              text: line.textAt(spill.origin) ?? '',
              style: spillStyleOf(paintAt(spill.origin), painted.get(cell.key)),
            };

      painted.set(
        cell.key,
        spilledPaint(painted.get(cell.key), spill, closingOf(spill.origin), covered),
      );
    }
    return painted;
  };

  const paintRow = (
    row: T | undefined,
    position: number,
    pinned: boolean,
    spans?: TableRowSpan,
  ): TableRowPaint => {
    const painted = new Map<string, TableCellPaint>();

    if (row === undefined) {
      return painted;
    }
    for (const key of paintedKeys.value) {
      const span = spans?.get(key);
      const paint = span === undefined ? paintCell(row, key, position, pinned) : paintSpan(span);

      if (paint === undefined) {
        continue;
      }

      painted.set(key, paint);
    }
    return pinned ? painted : floodPaints(row, position, painted, pinned);
  };

  const paintBody: TableRowPainter = (position, spans) =>
    paintRow(table.rowAtPosition(position), position, false, spans);

  const paintPinned: TableRowPainter = (position) =>
    paintRow(own.pinned()[position], position, true);

  const bodyPaint = computed(() => (own.cellStyle() === undefined ? undefined : paintBody));
  const pinnedPaint = computed(() => (own.cellStyle() === undefined ? undefined : paintPinned));

  return { bodyPaint, pinnedPaint };
};
