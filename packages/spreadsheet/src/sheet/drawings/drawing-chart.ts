import {
  ChartCategoriesKind,
  ChartGaps,
  ChartKind,
  ChartStacking,
  type ChartCategories,
  type ChartSeries,
  type ChartSpec,
  type ChartValue,
} from '@numior/charts';
import {
  CellValueKind,
  FormulaReferenceKind,
  SheetChartGaps,
  SheetChartKind,
  SheetChartStacking,
  type CellRange,
  type FormulaNode,
  type Sheet,
  type SheetChart,
} from '../../core';
import { cellText } from '../sheet-cells';
import { placedRange } from '../sheet-navigation';
import type { ChartSource } from './drawings.types';

interface ChartCell {
  readonly sheet: Sheet;
  readonly row: number;
  readonly col: number;
}

const MAX_POINTS = 4096;

const KINDS: Readonly<Record<SheetChartKind, ChartKind>> = {
  [SheetChartKind.Column]: ChartKind.Column,
  [SheetChartKind.Bar]: ChartKind.Bar,
  [SheetChartKind.Line]: ChartKind.Line,
  [SheetChartKind.Area]: ChartKind.Area,
  [SheetChartKind.Pie]: ChartKind.Pie,
  [SheetChartKind.Doughnut]: ChartKind.Doughnut,
  [SheetChartKind.Scatter]: ChartKind.Scatter,
};

const STACKINGS: Readonly<Record<SheetChartStacking, ChartStacking>> = {
  [SheetChartStacking.None]: ChartStacking.None,
  [SheetChartStacking.Stacked]: ChartStacking.Stacked,
  [SheetChartStacking.Percent]: ChartStacking.Percent,
};

const GAPS: Readonly<Record<SheetChartGaps, ChartGaps>> = {
  [SheetChartGaps.Break]: ChartGaps.Break,
  [SheetChartGaps.Connect]: ChartGaps.Connect,
};

const resolved = (node: FormulaNode, source: ChartSource): FormulaNode | undefined =>
  node.kind === FormulaReferenceKind.Name
    ? source.book.names.resolve(node.name, source.sheet)?.ast
    : node;

const sheetOf = (name: string | undefined, source: ChartSource): Sheet | undefined =>
  name === undefined ? source.sheet : source.book.sheet(name);

const cellsIn = (sheet: Sheet, range: CellRange): ChartCell[] => {
  const cells: ChartCell[] = [];

  for (let row = range.top; row <= range.bottom && cells.length < MAX_POINTS; row += 1) {
    for (let col = range.left; col <= range.right && cells.length < MAX_POINTS; col += 1) {
      cells.push({ sheet, row, col });
    }
  }
  return cells;
};

const cellsOf = (node: FormulaNode | undefined, source: ChartSource): ChartCell[] => {
  const target = node === undefined ? undefined : resolved(node, source);
  const placed = target === undefined ? undefined : placedRange(target);
  const sheet = placed === undefined ? undefined : sheetOf(placed.sheet, source);

  return placed === undefined || sheet === undefined || placed.book !== undefined
    ? []
    : cellsIn(sheet, placed.range);
};

const valueOf = (cell: ChartCell): ChartValue => {
  const value = cell.sheet.cells.get(cell.row, cell.col);

  return value.kind === CellValueKind.Number ? value.value : null;
};

const textOf = (cell: ChartCell, source: ChartSource): string =>
  cellText(source.book, cell.sheet, cell.row, cell.col, source.locale);

const nameOf = (
  name: FormulaNode | string | undefined,
  index: number,
  source: ChartSource,
): string => {
  if (typeof name === 'string') {
    return name;
  }

  const [first] = cellsOf(name, source);
  const text = first === undefined ? '' : textOf(first, source);

  return text === '' ? source.seriesName(index + 1) : text;
};

const categoriesOf = (chart: SheetChart, source: ChartSource, count: number): ChartCategories => {
  const cells = cellsOf(chart.series[0]?.categories, source);

  if (chart.kind === SheetChartKind.Scatter) {
    return {
      kind: ChartCategoriesKind.Number,
      values: Array.from({ length: count }, (_, index) => {
        const cell = cells[index];
        const value = cell === undefined ? null : valueOf(cell);

        return value ?? index + 1;
      }),
    };
  }
  return {
    kind: ChartCategoriesKind.Text,
    labels: Array.from({ length: count }, (_, index) => {
      const cell = cells[index];

      return cell === undefined ? String(index + 1) : textOf(cell, source);
    }),
  };
};

export const chartSpecOf = (chart: SheetChart, source: ChartSource): ChartSpec => {
  const series = chart.series.map((entry, index): ChartSeries => ({
    id: `series-${String(index)}`,
    name: nameOf(entry.name, index, source),
    values: cellsOf(entry.values, source).map(valueOf),
  }));

  const count = series.reduce((longest, entry) => Math.max(longest, entry.values.length), 0);

  return {
    kind: KINDS[chart.kind],
    categories: categoriesOf(chart, source, count),
    series,
    stacking: STACKINGS[chart.stacking],
    gaps: GAPS[chart.gaps],
    hole: chart.hole,
  };
};
