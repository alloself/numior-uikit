import { afterEach, describe, expect, it } from 'vite-plus/test';
import { createWorkbook, textValue, type Workbook } from '../src/core';
import { charsToPixels } from '../src';
import { SpreadsheetDriver } from './drivers/spreadsheet';

const mounted: SpreadsheetDriver[] = [];

const twoSheets = (): Workbook => {
  const book = createWorkbook();

  book.addSheet('Sales').cells.set(0, 1, textValue('Amount'));
  book.addSheet('Rates').cells.set(0, 1, textValue('Rate'));
  return book;
};

const open = (book: Workbook, readonly = false): SpreadsheetDriver => {
  const driver = SpreadsheetDriver.mount({ book, readonly, label: 'Book' });

  mounted.push(driver);
  return driver;
};

const widthInBook = (book: Workbook, sheet: string, col: number): number | undefined => {
  const size = book.sheet(sheet)?.layout.cols.get(col)?.size;

  return size === undefined ? undefined : charsToPixels(size);
};

afterEach(() => {
  for (const driver of mounted.splice(0)) {
    driver.unmount();
  }
});

describe('NuiSpreadsheet column widths', () => {
  it('writes the width of a dragged column into the book as one change', async () => {
    const book = twoSheets();
    const driver = open(book);

    await driver.settle();
    await driver.dragColumnEdge('B', 36);

    expect(driver.columnWidth('B')).toBe('100px');
    expect(widthInBook(book, 'Sales', 1)).toBe(100);
    expect(driver.changes).toHaveLength(1);
  });

  it('keeps a dragged width on its own sheet', async () => {
    const book = twoSheets();
    const driver = open(book);

    await driver.settle();
    await driver.dragColumnEdge('B', 36);
    await driver.chooseTab('Rates');
    await driver.settle();

    const onRates = driver.columnWidth('B');

    await driver.chooseTab('Sales');
    await driver.settle();

    expect([onRates, driver.columnWidth('B')]).toEqual(['64px', '100px']);
    expect(widthInBook(book, 'Rates', 1)).toBeUndefined();
  });

  it('takes a dragged width back with Ctrl+Z and returns it with Ctrl+Y', async () => {
    const book = twoSheets();
    const driver = open(book);

    await driver.settle();
    await driver.dragColumnEdge('B', 36);
    await driver.focus(1, 0);
    await driver.press('z', { ctrl: true });

    const undone = driver.columnWidth('B');

    await driver.press('y', { ctrl: true });

    expect([undone, driver.columnWidth('B')]).toEqual(['64px', '100px']);
  });

  it('steps the width from the keyboard on a column header and resets it by a double click on the edge', async () => {
    const book = twoSheets();
    const driver = open(book);

    await driver.settle();
    await driver.focusColumnHeader('B');
    await driver.press('ArrowRight', { alt: true });

    const stepped = widthInBook(book, 'Sales', 1);

    await driver.resetColumnEdge('B');

    expect([stepped, widthInBook(book, 'Sales', 1), driver.columnWidth('B')]).toEqual([
      74,
      undefined,
      '64px',
    ]);
  });

  it('shows a width dragged in a book that cannot be changed without writing it', async () => {
    const book = twoSheets();
    const driver = open(book, true);

    await driver.settle();
    await driver.dragColumnEdge('B', 36);

    expect(driver.columnWidth('B')).toBe('100px');
    expect(widthInBook(book, 'Sales', 1)).toBeUndefined();
    expect(driver.changes).toEqual([]);
  });
});
