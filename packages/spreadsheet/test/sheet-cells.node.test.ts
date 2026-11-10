import type { NuiTableCellStyle } from '@numior/table';
import { describe, expect, it } from 'vite-plus/test';
import { parseCell, textValue, type CellDecoration } from '../src/core';
import { sheetCells, type SheetCells } from '../src';
import { readWorkbook } from '../src/xlsx';
import { SALES_SHEET, xlsxPackage } from './xlsx-package';

const cellsOf = async (sheetXml = SALES_SHEET): Promise<SheetCells> => {
  const read = await readWorkbook(await xlsxPackage({ 'xl/worksheets/sheet1.xml': sheetXml }));

  if (read.kind === 'rejected') {
    throw new Error(`the package was rejected: ${read.reason}`);
  }

  const sheet = read.book.sheet('Sales');

  if (sheet === undefined) {
    throw new Error('Sales is missing');
  }
  return sheetCells({ book: read.book, sheet });
};

const painter = async (): Promise<
  (decoration: CellDecoration) => NuiTableCellStyle | undefined
> => {
  const book = await readWorkbook(await xlsxPackage());

  if (book.kind === 'rejected') {
    throw new Error('the package was rejected');
  }

  const sheet = book.book.sheet('Sales');

  if (sheet === undefined) {
    throw new Error('Sales is missing');
  }

  return (decoration) => {
    sheet.decorations.set(8, 0, book.book.decorations.id(decoration));
    sheet.cells.set(8, 0, textValue('x'));
    return sheetCells({ book: book.book, sheet }).source.cellAt(8, 0)?.style;
  };
};

const cellAt = (cells: SheetCells, address: string) => {
  const cell = parseCell(address);

  if (cell === undefined) {
    throw new Error(`${address} is not a cell`);
  }
  return cells.source.cellAt(cell.row, cell.col);
};

describe('sheet cells', () => {
  it('shows values through their number formats and aligns them by kind', async () => {
    const cells = await cellsOf();

    expect(cellAt(cells, 'A1')).toEqual({ text: 'Item', style: { overflow: true } });
    expect(cellAt(cells, 'B2')).toEqual({ text: '3', style: { align: 'end' } });
    expect(cellAt(cells, 'C2')?.text).toBe('75.0%');
    expect(cellAt(cells, 'H2')?.text).toBe('1/1/2025');
    expect(cellAt(cells, 'F2')).toEqual({ text: 'TRUE', style: { align: 'center' } });
    expect(cellAt(cells, 'Z9')).toBeUndefined();
  });

  it('paints fills, fonts, theme colours, borders and wrapping from the cell decoration', async () => {
    const cells = await cellsOf();

    expect(cellAt(cells, 'C4')).toEqual({
      text: '50.0%',
      style: {
        fill: '#FFFF00',
        color: '#000000',
        scheme: 'light',
        align: 'center',
        wrap: true,
        borders: { bottom: '1px solid currentColor' },
        style: { 'font-weight': '700' },
      },
    });
  });

  it('keeps author colours readable: semantic theme colours follow the page, fills get a contrasting ink', async () => {
    const cells = await cellsOf();
    const paint = await painter();

    expect(cells.source.cellAt(0, 0)?.style?.color).toBeUndefined();
    expect(paint({ font: { color: { kind: 'theme', theme: 1, tint: 0 } } })?.color).toBeUndefined();

    expect(
      paint({ fill: { pattern: 'solid', foreground: { kind: 'theme', theme: 0, tint: 0 } } })?.fill,
    ).toBeUndefined();

    expect(
      paint({ fill: { pattern: 'solid', foreground: { kind: 'rgb', argb: 'FFDAE3F3' } } })?.color,
    ).toBe('#000000');

    expect(
      paint({ fill: { pattern: 'solid', foreground: { kind: 'rgb', argb: 'FF1F3864' } } })?.color,
    ).toBe('#FFFFFF');

    expect(
      paint({
        font: { color: { kind: 'theme', theme: 1, tint: 0 } },
        fill: { pattern: 'solid', foreground: { kind: 'rgb', argb: 'FFFFFF00' } },
      })?.color,
    ).toBe('#000000');
  });

  it('picks the ink with the higher contrast on mid-tone fills', async () => {
    const paint = await painter();

    expect(
      ['FF63BE7B', 'FFF8696B', 'FF4472C4'].map(
        (argb) => paint({ fill: { pattern: 'solid', foreground: { kind: 'rgb', argb } } })?.color,
      ),
    ).toEqual(['#000000', '#000000', '#FFFFFF']);
  });

  it('gives the marks of filled cells the colour scheme of their fill and leaves the cell itself to the theme', async () => {
    const paint = await painter();

    const filled = ['FFDAE3F3', 'FF1F3864'].map((argb) =>
      paint({ fill: { pattern: 'solid', foreground: { kind: 'rgb', argb } } }),
    );

    expect(filled.map((look) => look?.scheme)).toEqual(['light', 'dark']);
    expect(filled.map((look) => look?.style?.['color-scheme'])).toEqual([undefined, undefined]);
    expect(paint({ font: { bold: true } })?.scheme).toBeUndefined();
  });

  it('sizes columns and rows in pixels, keeps merges and freezes the header row', async () => {
    const cells = await cellsOf(
      SALES_SHEET.replace(
        '<row r="2" spans="1:8">',
        '<row r="2" spans="1:8" ht="30" customHeight="1">',
      ),
    );

    expect(cells.source.columnWidth?.(0)).toBe(98);
    expect(cells.source.columnWidth?.(1)).toBe(64);
    expect(cells.rowHeights).toEqual({ 1: 40 });
    expect(cells.merges).toEqual([{ from: { row: 3, col: 5 }, to: { row: 3, col: 6 } }]);
    expect(cells.frozenRows).toBe(1);
    expect(cells.frozenCols).toBe(0);
    expect(cells.gridlines).toBe(true);
  });

  it('finds the edges of the data and the last used cell without walking the sheet', async () => {
    const cells = await cellsOf();

    expect(cells.source.nextEdge?.({ row: 0, col: 0 }, 'down')).toEqual({ row: 4, col: 0 });

    expect(cells.source.nextEdge?.({ row: 4, col: 0 }, 'down')).toEqual({
      row: 1_048_575,
      col: 0,
    });

    expect(cells.source.nextEdge?.({ row: 0, col: 1 }, 'next')).toEqual({ row: 0, col: 3 });
    expect(cells.source.nextEdge?.({ row: 0, col: 3 }, 'previous')).toEqual({ row: 0, col: 0 });
    expect(cells.source.nextEdge?.({ row: 4, col: 0 }, 'up')).toEqual({ row: 0, col: 0 });
    expect(cells.source.lastCell?.()).toEqual({ row: 4, col: 7 });
  });

  it('answers edges and the last cell in shown positions when lines are hidden', async () => {
    const cells = await cellsOf(
      SALES_SHEET.replace('<row r="3" spans="1:8">', '<row r="3" spans="1:8" hidden="1">').replace(
        '<cols><col min="1" max="1" width="14" customWidth="1"/></cols>',
        '<cols><col min="1" max="1" width="14" customWidth="1"/><col min="2" max="2" width="9" hidden="1"/></cols>',
      ),
    );

    expect(cells.source.nextEdge?.({ row: 0, col: 0 }, 'down')).toEqual({ row: 3, col: 0 });
    expect(cells.source.nextEdge?.({ row: 0, col: 0 }, 'next')).toEqual({ row: 0, col: 2 });
    expect(cells.source.lastCell?.()).toEqual({ row: 3, col: 6 });
  });

  it('shows and addresses a merge by its first cell when that cell is hidden', async () => {
    const cells = await cellsOf(
      SALES_SHEET.replace(
        '<c r="E4"><v>3</v></c></row>',
        '<c r="E4"><v>3</v></c><c r="F4"><v>7</v></c></row>',
      ).replace(
        '<cols><col min="1" max="1" width="14" customWidth="1"/></cols>',
        '<cols><col min="1" max="1" width="14" customWidth="1"/><col min="6" max="6" width="9" hidden="1"/></cols>',
      ),
    );

    expect(cells.merges).toEqual([{ from: { row: 3, col: 5 }, to: { row: 3, col: 5 } }]);
    expect(cells.source.columnLabel?.(5)).toBe('G');
    expect(cells.source.cellAt(3, 5)?.text).toBe('7');
    expect(cells.textAt(3, 5)).toBe('7');
    expect(cells.cellOf(3, 5)).toEqual({ row: 3, col: 5 });
    expect(cells.cellOf(2, 5)).toEqual({ row: 2, col: 6 });

    expect(cells.rangeOf({ from: { row: 3, col: 5 }, to: { row: 3, col: 5 } })).toEqual({
      top: 3,
      left: 5,
      bottom: 3,
      right: 6,
    });

    expect(cells.rangeOf({ from: { row: 4, col: 6 }, to: { row: 2, col: 4 } })).toEqual({
      top: 2,
      left: 4,
      bottom: 4,
      right: 7,
    });
  });

  it('leaves hidden rows and columns out and labels the rest with their sheet names', async () => {
    const cells = await cellsOf(
      SALES_SHEET.replace('<row r="3" spans="1:8">', '<row r="3" spans="1:8" hidden="1">').replace(
        '<cols><col min="1" max="1" width="14" customWidth="1"/></cols>',
        '<cols><col min="1" max="1" width="14" customWidth="1"/><col min="2" max="2" width="9" hidden="1"/></cols>',
      ),
    );

    expect(cells.source.rows).toBe(1_048_575);
    expect(cells.source.cols).toBe(16_383);
    expect(cells.source.rowLabel?.(2)).toBe('4');
    expect(cells.source.columnLabel?.(1)).toBe('C');
    expect(cells.source.cellAt(2, 1)?.text).toBe('50.0%');
    expect(cells.rowAt(2)).toBe(3);
    expect(cells.colAt(1)).toBe(2);
    expect(cells.merges).toEqual([{ from: { row: 2, col: 4 }, to: { row: 2, col: 5 } }]);
  });
});
