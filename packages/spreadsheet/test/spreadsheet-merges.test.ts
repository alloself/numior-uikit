import { afterEach, describe, expect, it } from 'vite-plus/test';
import {
  createCalculator,
  createCellEditor,
  createStepper,
  createWorkbook,
  formatRange,
  numberValue,
  textValue,
  type CellRange,
  type Workbook,
} from '../src/core';
import { SpreadsheetDriver } from './drivers/spreadsheet';

const mounted: SpreadsheetDriver[] = [];

const BLOCK: CellRange = { top: 0, left: 0, bottom: 1, right: 1 };

const filledBook = (): Workbook => {
  const book = createWorkbook();
  const sheet = book.addSheet('Plan');

  sheet.cells.set(0, 0, textValue('Total'));
  sheet.cells.set(0, 1, numberValue(2));
  sheet.cells.set(1, 0, numberValue(3));
  return book;
};

const mergedBook = (): Workbook => {
  const book = createWorkbook();
  const sheet = book.addSheet('Plan');

  sheet.cells.set(0, 0, textValue('Total'));
  sheet.layout = { ...sheet.layout, merges: [BLOCK] };
  return book;
};

const open = (book: Workbook, readonly = false): SpreadsheetDriver => {
  const driver = SpreadsheetDriver.mount({ book, readonly, label: 'Book' });

  mounted.push(driver);
  return driver;
};

const mergesOf = (book: Workbook): string[] =>
  (book.sheet('Plan')?.layout.merges ?? []).map((merge) => formatRange(merge));

const selectBlock = async (driver: SpreadsheetDriver, range: CellRange): Promise<void> => {
  await driver.select({ active: { row: range.top, col: range.left }, ranges: [range] });
};

afterEach(() => {
  for (const driver of mounted.splice(0)) {
    driver.unmount();
  }
});

describe('NuiSpreadsheet merged cells', () => {
  it('merges the selected cells from the cell menu, keeps the first value and says so', async () => {
    const book = filledBook();
    const driver = open(book);

    await selectBlock(driver, BLOCK);
    await driver.openCellMenu(1, 0);

    expect(driver.cellMenuItems).toContain('Merge cells');
    expect(driver.cellMenuItems).not.toContain('Unmerge cells');

    await driver.chooseCellMenuItem('Merge cells');

    expect(mergesOf(book)).toEqual(['A1:B2']);
    expect(driver.cellSpan(1, 0)).toEqual([2, 2]);
    expect(driver.text(1, 0)).toBe('Total');
    expect(book.sheet('Plan')?.cells.get(0, 1).kind).toBe('empty');
    expect(driver.note).toBe('Cells merged. Only the first value was kept');
    expect(driver.changes).toHaveLength(1);
  });

  it('returns the cells and their values with one undo', async () => {
    const book = filledBook();
    const driver = open(book);

    await selectBlock(driver, BLOCK);
    await driver.focus(1, 0);
    await driver.mergeCells();
    await driver.press('z', { ctrl: true });

    expect(mergesOf(book)).toEqual([]);
    expect([driver.text(1, 1), driver.text(2, 0)]).toEqual(['2', '3']);
  });

  it('offers to take a merged cell apart and leaves its value in the first cell', async () => {
    const book = mergedBook();
    const driver = open(book);

    await driver.focus(1, 0);
    await driver.openCellMenu(1, 0);

    expect(driver.cellMenuItems).toContain('Unmerge cells');
    expect(driver.cellMenuItems).not.toContain('Merge cells');

    await driver.chooseCellMenuItem('Unmerge cells');

    expect(mergesOf(book)).toEqual([]);
    expect(driver.cellSpan(1, 0)).toEqual([1, 1]);
    expect(driver.text(1, 0)).toBe('Total');
    expect(driver.announcement).toBe('Cells unmerged');
  });

  it('offers neither action for one plain cell', async () => {
    const driver = open(filledBook());

    await driver.focus(3, 2);
    await driver.openCellMenu(3, 2);

    expect(driver.cellMenuItems).not.toContain('Merge cells');
    expect(driver.cellMenuItems).not.toContain('Unmerge cells');
    expect(await driver.mergeCells()).toBe(false);
    expect(await driver.unmergeCells()).toBe(false);
    expect(driver.changes).toHaveLength(0);
  });

  it('leaves the merges of a read-only book as they are', async () => {
    const book = mergedBook();
    const driver = open(book, true);

    await driver.focus(1, 0);

    expect(await driver.unmergeCells()).toBe(false);
    expect(mergesOf(book)).toEqual(['A1:B2']);
  });

  it('merges without a note when no value is lost', async () => {
    const book = filledBook();
    const driver = open(book);

    await selectBlock(driver, { top: 3, left: 0, bottom: 3, right: 2 });

    expect(await driver.mergeCells()).toBe(true);
    expect(mergesOf(book)).toEqual(['A4:C4']);
    expect(driver.note).toBeUndefined();
    expect(driver.announcement).toBe('Cells merged');
  });

  it('refuses to merge the cells of a table and says why', async () => {
    const book = filledBook();
    const sheet = book.addSheet('Rates');
    const calculator = createCalculator(book);

    sheet.cells.set(0, 0, textValue('Item'));
    sheet.cells.set(1, 0, textValue('Pen'));

    createStepper(book, calculator).apply(
      createCellEditor(book, calculator).tableStep(sheet, {
        top: 0,
        left: 0,
        bottom: 1,
        right: 0,
      }),
    );

    const driver = SpreadsheetDriver.mount({ book, calculator, sheet: 1, label: 'Book' });

    mounted.push(driver);
    await selectBlock(driver, BLOCK);

    expect(await driver.mergeCells()).toBe(false);
    expect(sheet.layout.merges).toEqual([]);
    expect(driver.note).toBe('Cells of a table or a pivot table cannot be merged');

    expect(driver.refusals).toEqual([
      {
        reason: 'merge-blocked',
        message: 'Cells of a table or a pivot table cannot be merged',
      },
    ]);
  });
});
