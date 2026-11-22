import { describe, expect, it } from 'vite-plus/test';
import {
  DrawingAnchorKind,
  DrawingKind,
  SheetChartKind,
  chartAnchorAt,
  chartDataRange,
  chartOfRange,
  createCalculator,
  createWorkbook,
  freshDrawingId,
  insertDrawing,
  numberValue,
  printFormula,
  textValue,
  type CellRange,
  type FormulaNode,
  type SheetChart,
  type SheetDrawing,
  type Sheet,
  type Workbook,
} from '../src/core';
import { readWorkbook, writeWorkbook } from '../src/xlsx';

type Row = readonly (string | number | undefined)[];

const SHEET = 'Sales';

const bookOf = (rows: readonly Row[], name = SHEET): { book: Workbook; sheet: Sheet } => {
  const book = createWorkbook();
  const sheet = book.addSheet(name);

  rows.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      if (typeof value === 'number') {
        sheet.cells.set(rowIndex, colIndex, numberValue(value));
      } else if (value !== undefined) {
        sheet.cells.set(rowIndex, colIndex, textValue(value));
      }
    });
  });

  return { book, sheet };
};

const area = (top: number, left: number, bottom: number, right: number): CellRange => ({
  top,
  left,
  bottom,
  right,
});

const printed = (node: FormulaNode | string | undefined): string | undefined =>
  node === undefined || typeof node === 'string' ? node : printFormula(node);

const seriesOf = (chart: SheetChart | undefined): (string | undefined)[][] =>
  (chart?.series ?? []).map((series) => [
    printed(series.name),
    printed(series.categories),
    printed(series.values),
  ]);

const TABLE: readonly Row[] = [
  ['Month', 'Income', 'Costs'],
  ['Jan', 10, 4],
  ['Feb', 20, 8],
  ['Mar', 30, 9],
];

const chartIn = (
  rows: readonly Row[],
  range: CellRange,
  kind: SheetChartKind,
): SheetChart | undefined => chartOfRange(bookOf(rows).sheet.cells, SHEET, range, kind);

const drawingOf = (chart: SheetChart, row = 6): SheetDrawing => ({
  id: 'new-1',
  name: 'Chart 1',
  alt: '',
  anchor: chartAnchorAt(row, 1),
  content: { kind: DrawingKind.Chart, chart },
});

const reread = async (book: Workbook): Promise<readonly SheetDrawing[]> => {
  const written = await writeWorkbook(book, createCalculator(book));

  if (!written.ok) {
    throw new Error('the workbook was refused');
  }

  const read = await readWorkbook(written.bytes);

  if (read.kind === 'rejected') {
    throw new Error(`the written package was rejected: ${read.reason}`);
  }
  return read.book.sheets[0]?.layout.drawings ?? [];
};

describe('chart from a range', () => {
  it('takes the first row as names and the first column as categories', () => {
    const chart = chartIn(TABLE, area(0, 0, 3, 2), SheetChartKind.Column);

    expect(seriesOf(chart)).toEqual([
      ['Sales!$B$1', 'Sales!$A$2:$A$4', 'Sales!$B$2:$B$4'],
      ['Sales!$C$1', 'Sales!$A$2:$A$4', 'Sales!$C$2:$C$4'],
    ]);

    expect(chart?.legend).toBe(true);
  });

  it('skips a title above the headers and names series by the row next to the numbers', () => {
    const rows: Row[] = [['Budget'], ...TABLE];

    expect(seriesOf(chartIn(rows, area(0, 0, 4, 2), SheetChartKind.Column))).toEqual([
      ['Sales!$B$2', 'Sales!$A$3:$A$5', 'Sales!$B$3:$B$5'],
      ['Sales!$C$2', 'Sales!$A$3:$A$5', 'Sales!$C$3:$C$5'],
    ]);
  });

  it('fits a new anchor to the visible cells within its usual size', () => {
    expect([
      chartAnchorAt(2, 3, { row: 40, col: 6 }),
      chartAnchorAt(2, 3, { row: 3, col: 90 }),
    ]).toMatchObject([{ to: { row: 17, col: 6 } }, { to: { row: 8, col: 11 } }]);
  });

  it('turns rows into series when the data is wider than tall', () => {
    const rows: Row[] = [
      ['', 'Q1', 'Q2', 'Q3'],
      ['North', 1, 2, 3],
    ];

    expect(seriesOf(chartIn(rows, area(0, 0, 1, 3), SheetChartKind.Line))).toEqual([
      ['Sales!$A$2', 'Sales!$B$1:$D$1', 'Sales!$B$2:$D$2'],
    ]);
  });

  it('builds unnamed series from bare numbers and hides the legend for one', () => {
    const chart = chartIn([[1], [2], [3]], area(0, 0, 2, 0), SheetChartKind.Area);

    expect([seriesOf(chart), chart?.legend]).toEqual([
      [[undefined, undefined, 'Sales!$A$1:$A$3']],
      false,
    ]);
  });

  it('uses the first numeric column as x for a scatter chart', () => {
    const rows: Row[] = [
      ['x', 'y'],
      [1, 5],
      [2, 6],
    ];

    expect(seriesOf(chartIn(rows, area(0, 0, 2, 1), SheetChartKind.Scatter))).toEqual([
      ['Sales!$B$1', 'Sales!$A$2:$A$3', 'Sales!$B$2:$B$3'],
    ]);
  });

  it('keeps one series on a round chart and shows its legend', () => {
    const chart = chartIn(TABLE, area(0, 0, 3, 2), SheetChartKind.Doughnut);

    expect([chart?.series.length, chart?.legend, chart?.hole]).toEqual([1, true, 50]);
  });

  it('refuses a range without numbers', () => {
    expect(chartIn([['a', 'b']], area(0, 0, 0, 1), SheetChartKind.Column)).toBeUndefined();
  });

  it('grows a single cell to its region and trims a whole column to the data', () => {
    const { cells } = bookOf(TABLE).sheet;

    expect([
      chartDataRange(cells, area(1, 1, 1, 1)),
      chartDataRange(cells, area(0, 1, 1_048_575, 1)),
      chartDataRange(cells, area(10, 10, 12, 12)),
    ]).toEqual([area(0, 0, 3, 2), area(0, 1, 3, 1), undefined]);
  });

  it('keeps a new anchor inside the sheet and picks a free id', () => {
    const { sheet } = bookOf(TABLE);
    const chart = chartIn(TABLE, area(0, 0, 3, 2), SheetChartKind.Column);

    if (chart === undefined) {
      throw new Error('no chart');
    }

    const layout = insertDrawing(sheet.layout, drawingOf(chart));

    expect(chartAnchorAt(1_048_575, 16_383).kind).toBe(DrawingAnchorKind.Cells);
    expect(freshDrawingId(layout)).toMatch(/^new-2-[0-9a-z]{8}$/u);
    expect(freshDrawingId(layout)).not.toBe(freshDrawingId(layout));

    expect(chartAnchorAt(1_048_575, 16_383)).toMatchObject({
      to: { row: 1_048_575, col: 16_383 },
    });
  });
});

describe('writing a new chart', () => {
  for (const kind of Object.values(SheetChartKind)) {
    it(`reads back a ${kind} chart from a new package`, async () => {
      const { book, sheet } = bookOf(TABLE);
      const chart = chartIn(TABLE, area(0, 0, 3, 2), kind);

      if (chart === undefined) {
        throw new Error('no chart');
      }

      sheet.layout = insertDrawing(sheet.layout, drawingOf(chart));

      const [drawing] = await reread(book);

      if (drawing?.content.kind !== DrawingKind.Chart) {
        throw new Error('the chart did not come back');
      }

      expect([
        drawing.name,
        drawing.anchor,
        drawing.content.chart.kind,
        seriesOf(drawing.content.chart),
      ]).toEqual(['Chart 1', chartAnchorAt(6, 1), kind, seriesOf(chart)]);
    });
  }

  it('quotes a sheet name with a space', async () => {
    const name = 'My sales';
    const { book, sheet } = bookOf(TABLE, name);
    const chart = chartOfRange(sheet.cells, name, area(0, 0, 3, 1), SheetChartKind.Column);

    if (chart === undefined) {
      throw new Error('no chart');
    }

    sheet.layout = insertDrawing(sheet.layout, drawingOf(chart));

    const [drawing] = await reread(book);

    expect(drawing?.content.kind === DrawingKind.Chart && seriesOf(drawing.content.chart)).toEqual([
      ["'My sales'!$B$1", "'My sales'!$A$2:$A$4", "'My sales'!$B$2:$B$4"],
    ]);
  });
});
