import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  DrawingAnchorKind,
  DrawingKind,
  DrawingPlacement,
  EN_FORMULAS,
  SheetChartGaps,
  SheetChartKind,
  SheetChartStacking,
  createWorkbook,
  numberValue,
  parseFormula,
  textValue,
  type FormulaNode,
  type SheetDrawing,
  type Workbook,
} from '../src/core';
import { SpreadsheetDriver } from './drivers/spreadsheet';

const mounted: SpreadsheetDriver[] = [];

const sheetOf = (book: Workbook): SpreadsheetDriver => {
  const driver = SpreadsheetDriver.mount({ book, label: 'Drawings' });

  mounted.push(driver);
  return driver;
};

afterEach(() => {
  for (const driver of mounted.splice(0)) {
    driver.unmount();
  }
});

const reference = (text: string): FormulaNode => {
  const parsed = parseFormula(text, EN_FORMULAS);

  if (!parsed.ok) {
    throw new Error(`${text} is not a reference`);
  }
  return parsed.ast;
};

const CHART: SheetDrawing = {
  id: 'chart',
  name: 'Sales chart',
  alt: '',
  anchor: {
    kind: DrawingAnchorKind.Cells,
    placement: DrawingPlacement.TwoCell,
    from: { row: 5, col: 0, dx: 0, dy: 0 },
    to: { row: 10, col: 3, dx: 0, dy: 0 },
  },
  content: {
    kind: DrawingKind.Chart,
    chart: {
      kind: SheetChartKind.Column,
      title: 'Sales',
      legend: true,
      stacking: SheetChartStacking.None,
      gaps: SheetChartGaps.Break,
      hole: undefined,
      series: [
        {
          name: reference('Sales!$B$1'),
          categories: reference('Sales!$A$2:$A$4'),
          values: reference('Sales!$B$2:$B$4'),
        },
      ],
    },
  },
};

const PICTURE: SheetDrawing = {
  id: 'picture',
  name: 'Logo',
  alt: 'Company logo',
  anchor: {
    kind: DrawingAnchorKind.Cell,
    from: { row: 1, col: 4, dx: 4, dy: 2 },
    width: 90,
    height: 30,
  },
  content: {
    kind: DrawingKind.Picture,
    media: 'xl/media/image1.png',
    type: 'image/png',
    bytes: new Uint8Array([137, 80, 78, 71]),
  },
};

const SHAPE: SheetDrawing = {
  id: 'shape',
  name: 'Arrow',
  alt: '',
  anchor: { kind: DrawingAnchorKind.Point, x: 10, y: 10, width: 64, height: 40 },
  content: { kind: DrawingKind.Foreign, label: 'sp' },
};

const drawnBook = (drawings: readonly SheetDrawing[]): Workbook => {
  const book = createWorkbook();
  const sales = book.addSheet('Sales');

  sales.cells.set(0, 0, textValue('Item'));
  sales.cells.set(0, 1, textValue('Amount'));

  ['Pen', 'Ink', 'Pad'].forEach((item, index) => {
    sales.cells.set(index + 1, 0, textValue(item));
    sales.cells.set(index + 1, 1, numberValue((index + 1) * 10));
  });

  sales.layout = { ...sales.layout, drawings };
  return book;
};

describe('NuiSpreadsheet drawings', () => {
  it('sizes a chart by the cells under its anchor and draws a bar per value', () => {
    const sheet = sheetOf(drawnBook([CHART]));

    expect([sheet.drawings, sheet.drawingSize(0), sheet.chartBars(0)]).toEqual([
      ['chart: Sales'],
      '192×100',
      3,
    ]);
  });

  it('redraws the chart when a cell under a series changes', async () => {
    const sheet = sheetOf(drawnBook([CHART]));

    await sheet.enter(3, 1, 'text');

    expect(sheet.chartBars(0)).toBe(2);
  });

  it('shows pictures from object urls and revokes them on unmount', async () => {
    const revoke = vi.fn<(url: string) => void>();

    Object.defineProperties(URL, {
      createObjectURL: { configurable: true, value: () => 'blob:logo' },
      revokeObjectURL: { configurable: true, value: revoke },
    });

    const sheet = sheetOf(drawnBook([PICTURE, SHAPE]));

    await sheet.settle();

    expect([sheet.drawings, sheet.drawingSize(0), sheet.drawingSize(1)]).toEqual([
      ['picture: Company logo blob:logo', 'foreign: This object is not supported yet: Arrow (sp)'],
      '90×30',
      '64×40',
    ]);

    mounted.splice(0).forEach((driver) => {
      driver.unmount();
    });

    Reflect.deleteProperty(URL, 'createObjectURL');
    Reflect.deleteProperty(URL, 'revokeObjectURL');

    expect(revoke).toHaveBeenCalledWith('blob:logo');
  });
});
