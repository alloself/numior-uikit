import { afterEach, describe, expect, it } from 'vite-plus/test';
import { MAX_COLS, MAX_ROWS, createWorkbook, textValue, type Workbook } from '../src/core';
import { pointsToPixels } from '../src';
import { SpreadsheetDriver } from './drivers/spreadsheet';

const mounted: SpreadsheetDriver[] = [];

const twoSheets = (): Workbook => {
  const book = createWorkbook();

  book.addSheet('Sales').cells.set(1, 0, textValue('Amount'));
  book.addSheet('Rates').cells.set(1, 0, textValue('Rate'));
  return book;
};

const open = (book: Workbook, readonly = false): SpreadsheetDriver => {
  const driver = SpreadsheetDriver.mount({ book, readonly, label: 'Book' });

  mounted.push(driver);
  return driver;
};

const heightInBook = (book: Workbook, sheet: string, row: number): number | undefined => {
  const size = book.sheet(sheet)?.layout.rows.get(row)?.size;

  return size === undefined ? undefined : pointsToPixels(size);
};

const heightsInBook = (book: Workbook, sheet: string, rows: readonly number[]) =>
  rows.map((row) => heightInBook(book, sheet, row));

const wholeRows = (top: number, bottom: number) => ({
  top,
  left: 0,
  bottom,
  right: MAX_COLS - 1,
});

afterEach(() => {
  for (const driver of mounted.splice(0)) {
    driver.unmount();
  }
});

describe('NuiSpreadsheet row heights', () => {
  it('writes the height of a dragged row into the book as one change', async () => {
    const book = twoSheets();
    const driver = open(book);

    await driver.settle();
    await driver.dragRowEdge('2', 24);

    expect(driver.rowHeight('2')).toBe('44px');
    expect(heightInBook(book, 'Sales', 1)).toBe(44);
    expect(driver.changes).toHaveLength(1);
  });

  it('keeps a dragged height on its own sheet', async () => {
    const book = twoSheets();
    const driver = open(book);

    await driver.settle();
    await driver.dragRowEdge('2', 24);
    await driver.chooseTab('Rates');
    await driver.settle();

    const onRates = driver.rowHeight('2');

    await driver.chooseTab('Sales');
    await driver.settle();

    expect([onRates, driver.rowHeight('2')]).toEqual(['', '44px']);
    expect(heightInBook(book, 'Rates', 1)).toBeUndefined();
  });

  it('takes a dragged height back with Ctrl+Z and returns it with Ctrl+Y', async () => {
    const book = twoSheets();
    const driver = open(book);

    await driver.settle();
    await driver.dragRowEdge('2', 24);
    await driver.focus(1, 1);
    await driver.press('z', { ctrl: true });

    const undone = driver.rowHeight('2');

    await driver.press('y', { ctrl: true });

    expect([undone, driver.rowHeight('2')]).toEqual(['', '44px']);
  });

  it('steps the height from the keyboard on a row header and resets it by a double click on the edge', async () => {
    const book = twoSheets();
    const driver = open(book);

    await driver.settle();
    await driver.focusRowHeader('2');
    await driver.press('ArrowDown', { alt: true });

    const stepped = heightInBook(book, 'Sales', 1);

    await driver.resetRowEdge('2');

    expect([stepped, heightInBook(book, 'Sales', 1), driver.rowHeight('2')]).toEqual([
      28,
      undefined,
      '',
    ]);
  });

  it('shows a height dragged in a book that cannot be changed without writing it', async () => {
    const book = twoSheets();
    const driver = open(book, true);

    await driver.settle();
    await driver.dragRowEdge('2', 24);

    expect(driver.rowHeight('2')).toBe('44px');
    expect(heightInBook(book, 'Sales', 1)).toBeUndefined();
    expect(driver.changes).toEqual([]);
  });

  it('gives the dragged height to every selected row as one change', async () => {
    const book = twoSheets();
    const driver = open(book);

    await driver.settle();
    await driver.select({ active: { row: 1, col: 0 }, ranges: [wholeRows(1, 2), wholeRows(4, 4)] });
    await driver.dragRowEdge('3', 24);

    expect(heightsInBook(book, 'Sales', [0, 1, 2, 3, 4, 5])).toEqual([
      undefined,
      44,
      44,
      undefined,
      44,
      undefined,
    ]);

    expect(driver.changes).toHaveLength(1);
  });

  it('changes only the dragged row when it is outside the selected rows', async () => {
    const book = twoSheets();
    const driver = open(book);

    await driver.settle();
    await driver.select({ active: { row: 1, col: 0 }, ranges: [wholeRows(1, 2)] });
    await driver.dragRowEdge('4', 24);

    expect(heightsInBook(book, 'Sales', [1, 2, 3])).toEqual([undefined, undefined, 44]);
  });

  it('makes the dragged height the height of the sheet when every row is selected', async () => {
    const book = twoSheets();
    const driver = open(book);

    await driver.settle();
    await driver.dragRowEdge('2', 12);
    await driver.select({ active: { row: 0, col: 0 }, ranges: [wholeRows(0, MAX_ROWS - 1)] });
    await driver.dragRowEdge('4', 24);

    const layout = book.sheet('Sales')?.layout;

    expect(pointsToPixels(layout?.defaults.rowHeight ?? 0)).toBe(44);
    expect(layout?.rows.get(1)?.size).toBeUndefined();
    expect([driver.rowHeight('2'), driver.rowHeight('4')]).toEqual(['', '']);
  });

  it('refuses to size more rows at once than it can within a moment and says so', async () => {
    const book = twoSheets();
    const driver = open(book);

    await driver.settle();
    await driver.select({ active: { row: 1, col: 0 }, ranges: [wholeRows(1, 30_000)] });
    await driver.dragRowEdge('3', 24);

    expect(driver.note).toBe(
      'Too many rows are selected to size them at once. Select up to 20,000 rows or the whole sheet',
    );

    expect(driver.refusals).toEqual([expect.objectContaining({ reason: 'lines-too-many' })]);

    expect([driver.rowHeight('3'), heightInBook(book, 'Sales', 2), driver.changes]).toEqual([
      '',
      undefined,
      [],
    ]);
  });
});
