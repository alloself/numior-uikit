import { MAX_COLS, MAX_ROWS } from '../address';
import { currentRegion } from '../cell-region';
import type { CellStore } from '../cell-store';
import { CellValueKind, type CellAddress, type CellRange, type CellRef } from '../cell.types';
import { FormulaReferenceKind, type FormulaNode } from '../formula/formula.types';
import type { SheetLayout } from '../layout/layout.types';
import {
  DrawingAnchorKind,
  DrawingPlacement,
  SheetChartGaps,
  SheetChartKind,
  SheetChartStacking,
  type DrawingAnchor,
  type SheetChart,
  type SheetChartSeries,
  type SheetDrawing,
} from './drawing.types';

interface ChartGrid {
  readonly sheet: string;
  readonly body: CellRange;
  readonly labelRow: number | undefined;
  readonly labelCol: number | undefined;
}

const CHART_ROWS = 15;

const CHART_COLS = 8;

const LEAST_ROWS = 6;

const LEAST_COLS = 3;

const DOUGHNUT_HOLE = 50;

const ROUND_KINDS = new Set<SheetChartKind>([SheetChartKind.Pie, SheetChartKind.Doughnut]);

const absolute = (row: number, col: number): CellRef => ({
  row,
  col,
  rowAbsolute: true,
  colAbsolute: true,
});

const cellNode = (sheet: string, row: number, col: number): FormulaNode => ({
  kind: FormulaReferenceKind.Cell,
  sheet,
  ref: absolute(row, col),
});

const rangeNode = (sheet: string, range: CellRange): FormulaNode => ({
  kind: FormulaReferenceKind.Range,
  sheet,
  from: absolute(range.top, range.left),
  to: absolute(range.bottom, range.right),
});

const filledPart = (cells: CellStore, range: CellRange): CellRange | undefined => {
  let filled: CellRange | undefined;

  cells.forEachInRange(range, (row, col, value) => {
    if (value.kind !== CellValueKind.Empty) {
      filled = {
        top: Math.min(filled?.top ?? row, row),
        left: Math.min(filled?.left ?? col, col),
        bottom: Math.max(filled?.bottom ?? row, row),
        right: Math.max(filled?.right ?? col, col),
      };
    }
  });

  return filled;
};

const gridOf = (cells: CellStore, sheet: string, range: CellRange): ChartGrid | undefined => {
  let top = Number.POSITIVE_INFINITY;
  let left = Number.POSITIVE_INFINITY;

  cells.forEachInRange(range, (row, col, value) => {
    if (value.kind === CellValueKind.Number) {
      top = Math.min(top, row);
      left = Math.min(left, col);
    }
  });

  return top === Number.POSITIVE_INFINITY
    ? undefined
    : {
        sheet,
        body: { top, left, bottom: range.bottom, right: range.right },
        labelRow: top > range.top ? top - 1 : undefined,
        labelCol: left > range.left ? left - 1 : undefined,
      };
};

const columnSeries = (grid: ChartGrid, firstValue: number): SheetChartSeries[] => {
  const { sheet, body, labelRow, labelCol } = grid;
  const count = body.right - firstValue + 1;
  const shared = firstValue === body.left ? labelCol : body.left;

  return Array.from({ length: count }, (_, index) => {
    const col = firstValue + index;

    return {
      name: labelRow === undefined ? undefined : cellNode(sheet, labelRow, col),
      categories:
        shared === undefined
          ? undefined
          : rangeNode(sheet, { ...body, left: shared, right: shared }),
      values: rangeNode(sheet, { ...body, left: col, right: col }),
    };
  });
};

const rowSeries = (grid: ChartGrid): SheetChartSeries[] => {
  const { sheet, body, labelRow, labelCol } = grid;

  return Array.from({ length: body.bottom - body.top + 1 }, (_, index) => {
    const row = body.top + index;

    return {
      name: labelCol === undefined ? undefined : cellNode(sheet, row, labelCol),
      categories:
        labelRow === undefined
          ? undefined
          : rangeNode(sheet, { ...body, top: labelRow, bottom: labelRow }),
      values: rangeNode(sheet, { ...body, top: row, bottom: row }),
    };
  });
};

const seriesOf = (grid: ChartGrid, kind: SheetChartKind): SheetChartSeries[] => {
  const { body, labelCol } = grid;
  const rows = body.bottom - body.top + 1;
  const cols = body.right - body.left + 1;

  if (rows < cols) {
    return rowSeries(grid);
  }
  return kind === SheetChartKind.Scatter && labelCol === undefined && cols > 1
    ? columnSeries(grid, body.left + 1)
    : columnSeries(grid, body.left);
};

export const chartDataRange = (cells: CellStore, selected: CellRange): CellRange | undefined =>
  filledPart(
    cells,
    selected.top === selected.bottom && selected.left === selected.right
      ? currentRegion(cells, selected.top, selected.left)
      : selected,
  );

export const chartOfRange = (
  cells: CellStore,
  sheet: string,
  range: CellRange,
  kind: SheetChartKind,
): SheetChart | undefined => {
  const grid = gridOf(cells, sheet, range);

  if (grid === undefined) {
    return undefined;
  }

  const round = ROUND_KINDS.has(kind);
  const all = seriesOf(grid, kind);
  const series = round ? all.slice(0, 1) : all;

  return {
    kind,
    title: undefined,
    legend: round || series.length > 1,
    stacking: SheetChartStacking.None,
    gaps: SheetChartGaps.Break,
    hole: kind === SheetChartKind.Doughnut ? DOUGHNUT_HOLE : undefined,
    series,
  };
};

const spanTo = (end: number | undefined, start: number, least: number, most: number): number =>
  end === undefined ? most : Math.min(Math.max(end - start, least), most);

export const chartAnchorAt = (row: number, col: number, end?: CellAddress): DrawingAnchor => {
  const top = Math.min(row, MAX_ROWS - CHART_ROWS - 1);
  const left = Math.min(col, MAX_COLS - CHART_COLS - 1);

  return {
    kind: DrawingAnchorKind.Cells,
    placement: DrawingPlacement.TwoCell,
    from: { row: top, col: left, dx: 0, dy: 0 },
    to: {
      row: top + spanTo(end?.row, top, LEAST_ROWS, CHART_ROWS),
      col: left + spanTo(end?.col, left, LEAST_COLS, CHART_COLS),
      dx: 0,
      dy: 0,
    },
  };
};

export const freshDrawingId = (layout: SheetLayout): string => {
  const taken = new Set(layout.drawings.map((drawing) => drawing.id));
  let index = 1;

  while (taken.has(`new-${String(index)}`)) {
    index += 1;
  }
  return `new-${String(index)}`;
};

export const insertDrawing = (layout: SheetLayout, drawing: SheetDrawing): SheetLayout => ({
  ...layout,
  drawings: [...layout.drawings, drawing],
});
