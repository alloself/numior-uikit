import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { createWorkbook, numberValue, textValue, type Workbook } from '../src/core';
import { SpreadsheetDriver } from './drivers/spreadsheet';
import { stubPopovers } from './support/top-layer';

const ROWS = [
  ['Region', 'City', 'Amount'],
  ['East', 'Boston', 100],
  ['East', 'NYC', 200],
  ['West', 'LA', 150],
] as const;

const salesBook = (): Workbook => {
  const book = createWorkbook();
  const sales = book.addSheet('Sales');

  ROWS.forEach((row, at) => {
    row.forEach((value, col) => {
      sales.cells.set(at, col, typeof value === 'number' ? numberValue(value) : textValue(value));
    });
  });

  return book;
};

const mounted: SpreadsheetDriver[] = [];

const restorers: Array<() => void> = [];

const sheetOf = (book: Workbook): SpreadsheetDriver => {
  const driver = SpreadsheetDriver.mount({ book, label: 'Pivot book' });

  mounted.push(driver);
  return driver;
};

const pivotOf = async (): Promise<SpreadsheetDriver> => {
  const sheet = sheetOf(salesBook());

  await sheet.focus(1, 0);
  await sheet.insertPivot(1, 0);
  return sheet;
};

beforeEach(() => {
  restorers.push(stubPopovers());
});

afterEach(() => {
  for (const driver of mounted.splice(0)) {
    driver.unmount();
  }

  for (const restore of restorers.splice(0)) {
    restore();
  }
});

describe('NuiSpreadsheet pivot tables', () => {
  it('inserts an empty pivot table on a new sheet and opens its fields', async () => {
    const sheet = await pivotOf();

    expect(sheet.tabs).toEqual(['Pivot 1', 'Sales']);
    expect(sheet.selectedTab).toBe('Pivot 1');
    expect(sheet.pivot.open).toBe(true);
    expect(sheet.pivot.label).toBe('Pivot table fields');
    expect(sheet.pivot.focused).toBe(true);
    expect(sheet.pivot.fields).toEqual(['Region', 'City', 'Amount']);
    expect(sheet.pivot.checkedFields).toEqual([]);
    expect(sheet.pivot.chips('Rows')).toEqual([]);
  });

  it('builds the table from checked fields and closes back to the pivot cell', async () => {
    const sheet = await pivotOf();

    await sheet.pivot.check('Region');
    await sheet.pivot.check('Amount');

    expect(sheet.pivot.chips('Rows')).toEqual(['Region']);
    expect(sheet.pivot.chips('Values')).toEqual(['Sum of Amount']);
    expect(sheet.pivot.checkedFields).toEqual(['Region', 'Amount']);
    expect([sheet.text(3, 0), sheet.text(3, 1)]).toEqual(['Row Labels', 'Sum of Amount']);
    expect([sheet.text(4, 0), sheet.text(4, 1)]).toEqual(['East', '300']);
    expect([sheet.text(6, 0), sheet.text(6, 1)]).toEqual(['Grand Total', '450']);

    await sheet.pivot.press('Escape');

    expect(sheet.pivot.open).toBe(false);
    expect(sheet.focusedCell).toEqual({ row: 3, col: 0 });
  });

  it('moves fields between areas from the chip menu and the keyboard', async () => {
    const sheet = await pivotOf();

    await sheet.pivot.check('Region');
    await sheet.pivot.check('City');
    await sheet.pivot.check('Amount');

    expect(await sheet.pivot.actions('Region')).toEqual([
      'Move up',
      'Move down',
      'Move to beginning',
      'Move to end',
      'Move to filters',
      'Move to columns',
      'Move to values',
      'Remove field',
    ]);

    await sheet.pivot.chooseAction('Region', 'Move to columns');

    expect(sheet.pivot.chips('Columns')).toEqual(['Region']);
    expect(sheet.pivot.chips('Rows')).toEqual(['City']);
    expect(sheet.pivot.focusedChip).toBe('Region');
    expect(sheet.pivot.announcement).toBe('Region moved to Columns');

    await sheet.pivot.chooseAction('Region', 'Move to rows');
    await sheet.pivot.pressOnChip('Region', 'ArrowUp', true);

    expect(sheet.pivot.chips('Rows')).toEqual(['Region', 'City']);

    await sheet.pivot.pressOnChip('City', 'Delete');

    expect(sheet.pivot.chips('Rows')).toEqual(['Region']);
    expect(sheet.pivot.checkedFields).toEqual(['Region', 'Amount']);
    expect(sheet.pivot.focusedChip).toBe('Region');
  });

  it('adds the values field once there are two values and keeps it out of filters', async () => {
    const sheet = await pivotOf();

    await sheet.pivot.check('Amount');

    expect(sheet.pivot.chips('Values')).toEqual(['Sum of Amount']);
    expect(sheet.pivot.chips('Columns')).toEqual([]);

    await sheet.pivot.check('City');
    await sheet.pivot.chooseAction('City', 'Move to values');

    expect(sheet.pivot.chips('Values')).toEqual(['Sum of Amount', 'Count of City']);
    expect(sheet.pivot.chips('Columns')).toEqual(['Σ Values']);

    expect(await sheet.pivot.actions('Σ Values')).toEqual([
      'Move up',
      'Move down',
      'Move to beginning',
      'Move to end',
      'Move to rows',
    ]);
  });

  it('drags chips and fields between the areas and drops a chip on the fields to remove it', async () => {
    const sheet = await pivotOf();

    await sheet.pivot.check('Region');
    await sheet.pivot.check('City');
    await sheet.pivot.holdChip('City', 'Columns');

    expect(sheet.pivot.ghost).toBe('City');
    expect(sheet.pivot.targetArea).toBe('Columns');

    await sheet.pivot.dragChip('City', 'Columns');

    expect(sheet.pivot.ghost).toBeUndefined();
    expect(sheet.pivot.chips('Columns')).toEqual(['City']);
    expect(sheet.pivot.chips('Rows')).toEqual(['Region']);
    expect(sheet.pivot.announcement).toBe('City moved to Columns');

    await sheet.pivot.dragChip('City', 'Rows', 0);

    expect(sheet.pivot.chips('Rows')).toEqual(['City', 'Region']);

    await sheet.pivot.dragField('Amount', 'Values');

    expect(sheet.pivot.chips('Values')).toEqual(['Sum of Amount']);

    await sheet.pivot.dragChipToFields('Region');

    expect(sheet.pivot.chips('Rows')).toEqual(['City']);
    expect(sheet.pivot.checkedFields).toEqual(['City', 'Amount']);
  });

  it('keeps the values field out of filters, cancels a drag with Escape and leaves touch to scroll the fields', async () => {
    const sheet = await pivotOf();

    await sheet.pivot.check('Amount');
    await sheet.pivot.check('City');
    await sheet.pivot.chooseAction('City', 'Move to values');
    await sheet.pivot.holdChip('Σ Values', 'Filters');

    expect(sheet.pivot.targetArea).toBeUndefined();

    await sheet.pivot.press('Escape');

    expect(sheet.pivot.ghost).toBeUndefined();
    expect(sheet.pivot.open).toBe(true);
    expect(sheet.pivot.announcement).toBe('Move cancelled');

    await sheet.pivot.dragChip('Σ Values', 'Filters');

    expect(sheet.pivot.chips('Filters')).toEqual([]);
    expect(sheet.pivot.chips('Columns')).toEqual(['Σ Values']);

    await sheet.pivot.dragField('Region', 'Rows', true);

    expect(sheet.pivot.chips('Rows')).toEqual([]);
  });

  it('undoes field changes one step at a time and the insertion as one step', async () => {
    const sheet = await pivotOf();

    await sheet.pivot.check('Region');
    await sheet.pivot.press('Escape');
    await sheet.press('z', { ctrl: true });

    expect(sheet.text(4, 0)).toBe('');

    await sheet.press('z', { ctrl: true });

    expect(sheet.tabs).toEqual(['Sales']);
  });

  it('opens the fields and refreshes the table from the menu of a pivot cell', async () => {
    const book = salesBook();
    const sheet = sheetOf(book);

    await sheet.focus(1, 0);
    await sheet.insertPivot(1, 0);
    await sheet.pivot.check('Region');
    await sheet.pivot.check('Amount');
    await sheet.pivot.press('Escape');

    book.sheet('Sales')?.cells.set(3, 2, numberValue(400));
    await sheet.openCellMenu(5, 1);

    expect(sheet.cellMenuItems).toContain('Pivot table fields…');
    expect(sheet.cellMenuItems).toContain('Refresh');
    expect(sheet.cellMenuItems).not.toContain('Insert pivot table');

    await sheet.chooseCellMenuItem('Refresh');

    expect(sheet.text(5, 1)).toBe('400');
    expect(sheet.announcement).toBe('Pivot table refreshed');

    await sheet.openCellMenu(5, 1);
    await sheet.chooseCellMenuItem('Pivot table fields…');

    expect(sheet.pivot.open).toBe(true);
    expect(sheet.pivot.chips('Rows')).toEqual(['Region']);
  });

  it('refuses a source without a header row', async () => {
    const sheet = sheetOf(salesBook());

    await sheet.focus(10, 6);
    await sheet.insertPivot(10, 6);

    expect(sheet.tabs).toEqual(['Sales']);
    expect(sheet.pivot.open).toBe(false);
    expect(sheet.announcement).toBe('Select a table with a header row to build a pivot table');
  });
});
