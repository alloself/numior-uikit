import { LineAxis, type CellAddress } from '../cell.types';
import type { FormulaNode } from '../formula/formula.types';
import { shiftFormula, type LineChange } from '../formula/rewrite';
import { limitOf, shiftIndex } from '../lines';
import {
  DrawingAnchorKind,
  DrawingKind,
  DrawingPlacement,
  type DrawingAnchor,
  type DrawingMark,
  type SheetChart,
  type SheetChartSeries,
  type SheetDrawing,
} from './drawing.types';

type FormulaMap = (ast: FormulaNode) => FormulaNode;

const ORIGIN: CellAddress = { row: 0, col: 0 };

const EMU_PER_PIXEL = 9525;

export const pixelsOfEmu = (emu: number): number => emu / EMU_PER_PIXEL;

const lineOf = (mark: DrawingMark, axis: LineAxis): number =>
  axis === LineAxis.Rows ? mark.row : mark.col;

const withLine = (mark: DrawingMark, axis: LineAxis, line: number): DrawingMark => {
  if (lineOf(mark, axis) === line) {
    return mark;
  }
  return axis === LineAxis.Rows ? { ...mark, row: line } : { ...mark, col: line };
};

const shiftMark = (mark: DrawingMark, change: LineChange): DrawingMark =>
  withLine(
    mark,
    change.axis,
    shiftIndex(lineOf(mark, change.axis), change) ?? Math.min(change.at, limitOf(change.axis) - 1),
  );

const followMark = (mark: DrawingMark, change: LineChange, delta: number): DrawingMark =>
  withLine(
    mark,
    change.axis,
    Math.min(Math.max(lineOf(mark, change.axis) + delta, 0), limitOf(change.axis) - 1),
  );

const shiftAnchor = (anchor: DrawingAnchor, change: LineChange): DrawingAnchor => {
  switch (anchor.kind) {
    case DrawingAnchorKind.Point:
      return anchor;
    case DrawingAnchorKind.Cell: {
      const from = shiftMark(anchor.from, change);

      return from === anchor.from ? anchor : { ...anchor, from };
    }
    case DrawingAnchorKind.Cells: {
      if (anchor.placement === DrawingPlacement.Absolute) {
        return anchor;
      }

      const from = shiftMark(anchor.from, change);

      const to =
        anchor.placement === DrawingPlacement.OneCell
          ? followMark(
              anchor.to,
              change,
              lineOf(from, change.axis) - lineOf(anchor.from, change.axis),
            )
          : shiftMark(anchor.to, change);

      return from === anchor.from && to === anchor.to ? anchor : { ...anchor, from, to };
    }
  }
};

const mapSeries = (series: SheetChartSeries, map: FormulaMap): SheetChartSeries => {
  const name =
    series.name === undefined || typeof series.name === 'string' ? series.name : map(series.name);

  const categories = series.categories === undefined ? undefined : map(series.categories);
  const values = series.values === undefined ? undefined : map(series.values);

  return name === series.name && categories === series.categories && values === series.values
    ? series
    : { name, categories, values };
};

const mapChart = (chart: SheetChart, map: FormulaMap): SheetChart => {
  const series = chart.series.map((entry) => mapSeries(entry, map));

  return series.every((entry, index) => entry === chart.series[index])
    ? chart
    : { ...chart, series };
};

const mapDrawing = (drawing: SheetDrawing, map: FormulaMap): SheetDrawing => {
  if (drawing.content.kind !== DrawingKind.Chart) {
    return drawing;
  }

  const chart = mapChart(drawing.content.chart, map);

  return chart === drawing.content.chart
    ? drawing
    : { ...drawing, content: { kind: DrawingKind.Chart, chart } };
};

const sameDrawings = (left: readonly SheetDrawing[], right: readonly SheetDrawing[]): boolean =>
  left.every((drawing, index) => drawing === right[index]);

export const mapDrawingFormulas = (
  drawings: readonly SheetDrawing[],
  map: FormulaMap,
): readonly SheetDrawing[] => {
  const mapped = drawings.map((drawing) => mapDrawing(drawing, map));

  return sameDrawings(mapped, drawings) ? drawings : mapped;
};

export const shiftDrawings = (
  drawings: readonly SheetDrawing[],
  change: LineChange,
  own: boolean,
): readonly SheetDrawing[] => {
  const moved = drawings.map((drawing) => {
    const anchor = own ? shiftAnchor(drawing.anchor, change) : drawing.anchor;
    const shifted = mapDrawing(drawing, (ast) => shiftFormula(ast, change, own, ORIGIN));

    return anchor === drawing.anchor ? shifted : { ...shifted, anchor };
  });

  return sameDrawings(moved, drawings) ? drawings : moved;
};
