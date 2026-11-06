import { afterEach, describe, expect, it } from 'vite-plus/test';
import {
  RU_LOCALE,
  createCalculator,
  createWorkbook,
  numberValue,
  textValue,
  type SheetView,
  type Workbook,
} from '../src/core';
import { SpreadsheetDriver } from './drivers/spreadsheet';

const mounted: SpreadsheetDriver[] = [];

const salesBook = (view: Partial<SheetView> = { frozenRows: 1 }): Workbook => {
  const book = createWorkbook();
  const sales = book.addSheet('Sales');
  const rates = book.addSheet('Rates');

  sales.cells.set(0, 0, textValue('Item'));
  sales.cells.set(0, 1, textValue('Amount'));
  sales.cells.set(1, 0, textValue('Pen'));
  sales.cells.set(1, 2, numberValue(0.75));
  sales.formats.set(1, 2, book.formats.id('0.0%'));
  rates.cells.set(0, 0, textValue('Rate'));
  sales.layout = { ...sales.layout, view: { ...sales.layout.view, ...view } };
  return book;
};

const sheetOf = (...args: Parameters<typeof SpreadsheetDriver.mount>): SpreadsheetDriver => {
  const driver = SpreadsheetDriver.mount(...args);

  mounted.push(driver);
  return driver;
};

afterEach(() => {
  for (const driver of mounted.splice(0)) {
    driver.unmount();
  }
});

describe('NuiSpreadsheet', () => {
  it('lays the sheet out with A1 headers, gridlines and the frozen header row', () => {
    const sheet = sheetOf({ book: salesBook(), label: 'Sales book' });

    expect(sheet.label).toBe('Sales book');
    expect(sheet.columnLabels).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(sheet.rowLabels).toEqual(['1', '2', '3', '4', '5']);
    expect(sheet.text(1, 0)).toBe('Item');
    expect(sheet.text(2, 2)).toBe('75.0%');
    expect(sheet.frozenRows).toBe(1);
    expect(sheet.bordered).toBe(true);
    expect(sheet.direction).toBe('ltr');
  });

  it('switches sheets, follows a right-to-left sheet without gridlines and freezes columns', async () => {
    const book = salesBook({ gridlines: false, rightToLeft: true, frozenCols: 1 });

    const sheet = sheetOf({ book, label: 'Sales book' });

    expect(sheet.direction).toBe('rtl');
    expect(sheet.bordered).toBe(false);
    expect(sheet.pinnedColumns).toBe(1);
    expect(sheet.frozenRows).toBe(0);

    await sheet.show({ sheet: 1 });

    expect(sheet.text(1, 0)).toBe('Rate');
    expect(sheet.direction).toBe('ltr');
  });

  it('renders nothing for a book without sheets', () => {
    expect(sheetOf({ book: createWorkbook(), label: 'Empty' }).rendered).toBe(false);
  });

  it('enters values and formulas that take the referenced format, recalculates and shows the formula on F2', async () => {
    const sheet = sheetOf({ book: salesBook(), label: 'Sales book' });

    await sheet.enter(3, 2, '4');
    await sheet.enter(3, 1, '=C2*2+C3');

    expect(sheet.text(3, 1)).toBe('550.0%');
    expect(sheet.changes).toHaveLength(2);
    expect(sheet.changes[1]?.steps[0]).toMatchObject({ kind: 'batch' });

    await sheet.focus(3, 1);
    await sheet.press('F2');

    expect(sheet.editorText).toBe('=C2*2+C3');

    await sheet.press('Escape');
    await sheet.press('9');

    expect(sheet.editorText).toBe('9');

    await sheet.press('Escape');
    await sheet.enter(3, 2, '10');

    expect(sheet.text(3, 1)).toBe('1150.0%');
  });

  it('keeps a broken formula in the editor with the position of the error', async () => {
    const sheet = sheetOf({ book: salesBook(), label: 'Sales book' });

    await sheet.enter(4, 1, '=SUM(1,');

    expect(sheet.editing).toBe(true);
    expect(sheet.editorError).toBe('The formula has an error at character 8');
    expect(sheet.changes).toEqual([]);
  });

  it('undoes and redoes edits through the workbook history', async () => {
    const sheet = sheetOf({ book: salesBook(), label: 'Sales book' });

    await sheet.enter(2, 0, 'Pencil');

    expect(sheet.text(2, 0)).toBe('Pencil');

    await sheet.press('z', { ctrl: true });

    expect(sheet.text(2, 0)).toBe('Pen');

    await sheet.press('y', { ctrl: true });

    expect(sheet.text(2, 0)).toBe('Pencil');
    expect(sheet.changes).toHaveLength(3);
  });

  it('reads and prints formulas in the sheet locale through a given calculator', async () => {
    const book = salesBook();
    const calculator = createCalculator(book);

    const sheet = sheetOf({ book, calculator, locale: RU_LOCALE, label: 'Продажи' });

    await sheet.enter(3, 1, '=СУММ(C2;0,25)');

    expect(sheet.text(3, 1)).toBe('100,0%');
    expect(calculator.pending).toBe(0);

    await sheet.focus(3, 1);
    await sheet.press('F2');

    expect(sheet.editorText).toBe('=СУММ(C2;0,25)');
  });

  it('leaves a read-only sheet untouched', async () => {
    const sheet = sheetOf({ book: salesBook(), label: 'Sales book', readonly: true });

    await sheet.enter(2, 0, 'Pencil');

    expect(sheet.editing).toBe(false);
    expect(sheet.text(2, 0)).toBe('Pen');
    expect(sheet.changes).toEqual([]);
  });
});
