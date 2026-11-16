import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { installTextCanvas, type TextCanvas } from '../../table/test/harness/text-canvas';
import {
  MAX_COLS,
  MAX_ROWS,
  createWorkbook,
  lineLayoutsOf,
  textValue,
  type CellDecoration,
  type LineLayout,
  type Sheet,
  type Workbook,
} from '../src/core';
import { charsToPixels } from '../src';
import { SpreadsheetDriver } from './drivers/spreadsheet';

const CHAR = 7;

const BOLD_CHAR = 8;

const TITLE = 'Quarterly revenue';

const LONGER = 'A note that nobody has to read in full';

const MANY = 10_050;

const HIDDEN_LINE: LineLayout = {
  size: undefined,
  custom: false,
  hidden: true,
  level: 0,
  collapsed: false,
  style: undefined,
  extra: [],
};

const mounted: SpreadsheetDriver[] = [];

const salesOf = (book: Workbook): Sheet => {
  const sheet = book.sheet('Sales');

  if (sheet === undefined) {
    throw new Error('Sales is missing');
  }
  return sheet;
};

const salesBook = (): Workbook => {
  const book = createWorkbook();
  const sales = book.addSheet('Sales');

  sales.cells.set(0, 1, textValue('Amount'));
  sales.cells.set(1, 1, textValue(TITLE));
  return book;
};

const decorate = (book: Workbook, row: number, col: number, decoration: CellDecoration): void => {
  salesOf(book).decorations.set(row, col, book.decorations.id(decoration));
};

const open = (book: Workbook, readonly = false): SpreadsheetDriver => {
  const driver = SpreadsheetDriver.mount({ book, readonly, label: 'Book' });

  mounted.push(driver);
  return driver;
};

const widthInBook = (book: Workbook, col: number): number | undefined => {
  const size = salesOf(book).layout.cols.get(col)?.size;

  return size === undefined ? undefined : charsToPixels(size);
};

const wholeCols = (left: number, right: number) => ({
  top: 0,
  left,
  bottom: MAX_ROWS - 1,
  right,
});

describe('NuiSpreadsheet column width by content', () => {
  let canvas: TextCanvas | undefined;

  beforeEach(() => {
    canvas = installTextCanvas();
  });

  afterEach(() => {
    for (const driver of mounted.splice(0)) {
      driver.unmount();
    }

    canvas?.restore();
  });

  it('fits a column to its widest text by a double click on the header edge and takes it back with Ctrl+Z', async () => {
    const book = salesBook();
    const driver = open(book);

    await driver.settle();
    await driver.resetColumnEdge('B');

    const fitted = [widthInBook(book, 1), driver.columnWidth('B'), driver.changes.length];
    const told = driver.announcement;

    await driver.focus(1, 0);
    await driver.press('z', { ctrl: true });

    expect(fitted).toEqual([TITLE.length * CHAR, `${String(TITLE.length * CHAR)}px`, 1]);
    expect(told).toBe('The column width fits its content');
    expect(driver.columnWidth('B')).toBe('64px');
  });

  it('fits a column with a short text to 48 px', async () => {
    const book = salesBook();

    salesOf(book).cells.set(0, 2, textValue('Sum'));

    const driver = open(book);

    await driver.settle();
    await driver.resetColumnEdge('C');

    expect([widthInBook(book, 2), driver.columnWidth('C')]).toEqual([48, '48px']);
  });

  it('measures a bold cell in its own font', async () => {
    const book = salesBook();

    decorate(book, 1, 1, { font: { bold: true } });

    const driver = open(book);

    await driver.settle();
    await driver.resetColumnEdge('B');

    expect(widthInBook(book, 1)).toBe(TITLE.length * BOLD_CHAR);
  });

  it('leaves out hidden rows and cells merged across columns and reads a wrapped cell by its lines', async () => {
    const book = salesBook();
    const sales = salesOf(book);

    sales.cells.set(2, 1, textValue(LONGER));
    sales.cells.set(3, 1, textValue(LONGER));
    sales.cells.set(4, 1, textValue(`${TITLE}!\nShort`));
    decorate(book, 4, 1, { alignment: { wrap: true } });

    sales.layout = {
      ...sales.layout,
      rows: lineLayoutsOf([[2, HIDDEN_LINE]]),
      merges: [{ top: 3, left: 1, bottom: 3, right: 2 }],
    };

    const driver = open(book);

    await driver.settle();
    await driver.resetColumnEdge('B');

    expect(widthInBook(book, 1)).toBe((TITLE.length + 1) * CHAR);
  });

  it('returns an empty column to the width of the sheet', async () => {
    const book = salesBook();
    const driver = open(book);

    await driver.settle();
    await driver.dragColumnEdge('D', 36);
    await driver.resetColumnEdge('D');

    expect([widthInBook(book, 3), driver.columnWidth('D')]).toEqual([undefined, '64px']);
    expect(driver.announcement).not.toBe('The column width fits its content');
  });

  it('fits every selected column to its own content as one change', async () => {
    const book = salesBook();

    salesOf(book).cells.set(0, 2, textValue(LONGER));

    const driver = open(book);

    await driver.settle();
    await driver.select({ active: { row: 0, col: 1 }, ranges: [wholeCols(1, 3)] });
    await driver.resetColumnEdge('C');

    expect([1, 2, 3].map((col) => widthInBook(book, col))).toEqual([
      TITLE.length * CHAR,
      LONGER.length * CHAR,
      undefined,
    ]);

    expect(driver.changes).toHaveLength(1);
  });

  it('fits the filled columns and returns the others to the default when the whole sheet is selected', async () => {
    const book = salesBook();
    const driver = open(book);

    await driver.settle();
    await driver.dragColumnEdge('D', 36);
    await driver.select({ active: { row: 0, col: 0 }, ranges: [wholeCols(0, MAX_COLS - 1)] });
    await driver.resetColumnEdge('A');

    expect([1, 3].map((col) => widthInBook(book, col))).toEqual([TITLE.length * CHAR, undefined]);
    expect(salesOf(book).layout.defaults.colWidth).toBeUndefined();
  });

  it('says so when a column has more cells than it measures at once', async () => {
    const book = salesBook();
    const sales = salesOf(book);

    for (let row = 2; row < MANY; row += 1) {
      sales.cells.set(row, 1, textValue('Item'));
    }

    sales.cells.set(MANY, 1, textValue(LONGER));

    const driver = open(book);

    await driver.settle();
    await driver.resetColumnEdge('B');

    expect(widthInBook(book, 1)).toBe(TITLE.length * CHAR);

    expect(driver.note).toBe(
      'The width fits the cells on screen and the first ones from the top: there are too many cells to measure them all',
    );
  });

  it('leaves the book alone when it cannot be changed', async () => {
    const book = salesBook();
    const driver = open(book, true);

    await driver.settle();
    await driver.resetColumnEdge('B');

    expect([widthInBook(book, 1), driver.changes]).toEqual([undefined, []]);
  });
});
