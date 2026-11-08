import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { SpreadsheetDriver } from './drivers/spreadsheet';
import { salesBook } from './support/pivot-book';
import { stubPopovers } from './support/top-layer';

const mounted: SpreadsheetDriver[] = [];

const restorers: Array<() => void> = [];

const pivotWith = async (...fields: string[]): Promise<SpreadsheetDriver> => {
  const sheet: SpreadsheetDriver = SpreadsheetDriver.mount({
    book: salesBook(),
    label: 'Pivot book',
  });

  mounted.push(sheet);
  await sheet.focus(1, 0);
  await sheet.insertPivot(1, 0);

  for (const field of fields) {
    await sheet.pivot.check(field);
  }

  return sheet;
};

const column = (sheet: SpreadsheetDriver, col: number, from: number, to: number): string[] =>
  Array.from({ length: to - from + 1 }, (_, at) => sheet.text(from + at, col) ?? '');

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

describe('NuiSpreadsheet pivot options', () => {
  it('switches the report layout and the grand totals from the options menu', async () => {
    const sheet = await pivotWith('Region', 'City', 'Amount');

    expect(await sheet.pivot.checkedOptions()).toEqual([
      'Compact form',
      'Grand totals for rows',
      'Grand totals for columns',
      'Autofit column widths',
    ]);

    expect(column(sheet, 0, 3, 9)).toEqual([
      'Row Labels',
      'East',
      'Boston',
      'NYC',
      'West',
      'LA',
      'Grand Total',
    ]);

    await sheet.pivot.chooseOption('Outline form');

    expect(sheet.pivot.announcement).toBe('Pivot table options changed');

    expect([sheet.text(3, 0), sheet.text(3, 1), sheet.text(5, 1), sheet.text(5, 2)]).toEqual([
      'Region',
      'City',
      'Boston',
      '100',
    ]);

    await sheet.pivot.chooseOption('Tabular form');

    expect(column(sheet, 2, 4, 9)).toEqual(['100', '200', '300', '150', '150', '450']);
    expect([sheet.text(4, 0), sheet.text(6, 0)]).toEqual(['East', 'East Total']);

    await sheet.pivot.chooseOption('Grand totals for columns');

    expect(column(sheet, 2, 4, 9)).toEqual(['100', '200', '300', '150', '150', '']);

    expect(await sheet.pivot.checkedOptions()).toEqual([
      'Tabular form',
      'Grand totals for rows',
      'Autofit column widths',
    ]);
  });

  it('fits the pivot columns to their texts until autofit is turned off', async () => {
    const sheet = await pivotWith('Region');

    expect(sheet.columnWidths(3)).toEqual([91, 64, 64]);

    await sheet.pivot.check('Amount');

    expect(sheet.columnWidths(3)).toEqual([91, 105, 64]);

    await sheet.pivot.chooseOption('Autofit column widths');
    await sheet.pivot.chooseOption('Tabular form');

    expect(sheet.text(3, 0)).toBe('Region');
    expect(sheet.columnWidths(3)).toEqual([91, 105, 64]);

    expect(await sheet.pivot.checkedOptions()).toEqual([
      'Tabular form',
      'Grand totals for rows',
      'Grand totals for columns',
    ]);
  });
});
