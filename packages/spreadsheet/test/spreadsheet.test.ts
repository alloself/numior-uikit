import { afterEach, describe, expect, it } from 'vite-plus/test';
import { createWorkbook, numberValue, textValue, type SheetView, type Workbook } from '../src/core';
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
});
