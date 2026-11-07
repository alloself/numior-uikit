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

const column = (
  sheet: SpreadsheetDriver,
  col: number,
  from: number,
  to: number,
): (string | undefined)[] =>
  Array.from({ length: to - from + 1 }, (_, at) => sheet.text(from + at, col));

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

describe('NuiSpreadsheet pivot field settings', () => {
  it('sorts a row field descending and hides an unchecked item', async () => {
    const sheet = await pivotWith('Region', 'Amount');

    await sheet.pivot.chooseAction('Region', 'Filter and sort…');

    expect(sheet.pivot.subview).toBe('Region');
    expect(sheet.pivot.focusedInput).toBe('Search');
    expect(sheet.pivot.items).toEqual(['East', 'West']);
    expect(sheet.pivot.checkedItems).toEqual(['East', 'West']);
    expect(sheet.pivot.selectAll).toBe('checked');

    expect(sheet.pivot.sortOptions).toEqual([
      'Ascending (A to Z)',
      'Descending (Z to A)',
      'Source order',
    ]);

    await sheet.pivot.chooseSort('Descending (Z to A)');
    await sheet.pivot.applyEditor();

    expect(sheet.pivot.subview).toBe(undefined);
    expect(sheet.pivot.focusedChip).toBe('Region');
    expect(sheet.pivot.announcement).toBe('Region: items updated');
    expect(column(sheet, 0, 4, 6)).toEqual(['West', 'East', 'Grand Total']);

    await sheet.pivot.chooseAction('Region', 'Filter and sort…');

    expect(sheet.pivot.items).toEqual(['West', 'East']);

    await sheet.pivot.toggleItem('West');

    expect(sheet.pivot.selectAll).toBe('mixed');

    await sheet.pivot.applyEditor();

    expect([...column(sheet, 0, 4, 5), ...column(sheet, 1, 4, 5)]).toEqual([
      'East',
      'Grand Total',
      '300',
      '300',
    ]);
  });

  it('searches items, selects every match and refuses to hide them all', async () => {
    const sheet = await pivotWith('City', 'Amount');

    await sheet.pivot.chooseAction('City', 'Filter and sort…');

    expect(sheet.pivot.items).toEqual(['Boston', 'LA', 'NYC']);

    await sheet.pivot.fill('Search', 'o');

    expect(sheet.pivot.items).toEqual(['Boston']);

    await sheet.pivot.toggleItem('(Select all)');
    await sheet.pivot.fill('Search', '');

    expect(sheet.pivot.checkedItems).toEqual(['LA', 'NYC']);

    await sheet.pivot.toggleItem('(Select all)');

    expect(sheet.pivot.checkedItems).toEqual(['Boston', 'LA', 'NYC']);

    await sheet.pivot.toggleItem('(Select all)');

    expect(sheet.pivot.checkedItems).toEqual([]);
    expect(sheet.pivot.canApply).toBe(false);

    await sheet.pivot.fill('Search', 'zzz');

    expect(sheet.pivot.items).toEqual([]);
  });

  it('picks a single item of a filter field without sort options', async () => {
    const sheet = await pivotWith('Region', 'Amount');

    await sheet.pivot.chooseAction('Region', 'Move to filters');
    await sheet.pivot.chooseAction('Region', 'Select items…');

    expect(sheet.pivot.subview).toBe('Region');

    expect(sheet.pivot.sortOptions).toEqual([]);

    await sheet.pivot.toggleItem('East');
    await sheet.pivot.applyEditor();

    expect([sheet.text(3, 0), sheet.text(3, 1)]).toEqual(['Region', 'West']);
    expect([sheet.text(5, 0), sheet.text(6, 0)]).toEqual(['Sum of Amount', '150']);
  });

  it('turns the subtotals of an outer row field off from its menu', async () => {
    const sheet = await pivotWith('Region', 'City', 'Amount');

    expect(await sheet.pivot.actionChecked('Region', 'Show subtotals')).toBe(true);
    expect([sheet.text(4, 0), sheet.text(4, 1)]).toEqual(['East', '300']);

    await sheet.pivot.toggleAction('Region', 'Show subtotals');

    expect(await sheet.pivot.actionChecked('Region', 'Show subtotals')).toBe(false);
    expect(column(sheet, 1, 4, 9)).toEqual(['East', '100', '200', 'West', '150', '450']);
  });

  it('returns to the fields with Escape and Cancel', async () => {
    const sheet = await pivotWith('Region', 'Amount');

    await sheet.pivot.chooseAction('Region', 'Filter and sort…');
    await sheet.pivot.toggleItem('East');
    await sheet.pivot.press('Escape');

    expect(sheet.pivot.open).toBe(true);
    expect(sheet.pivot.subview).toBe(undefined);
    expect(sheet.pivot.focusedChip).toBe('Region');
    expect(sheet.text(4, 0)).toBe('East');

    await sheet.pivot.chooseAction('Sum of Amount', 'Value field settings…');

    expect(sheet.pivot.subview).toBe('Amount');

    await sheet.pivot.cancelEditor();

    expect(sheet.pivot.subview).toBe(undefined);
    expect(sheet.pivot.focusedChip).toBe('Sum of Amount');
  });

  it('summarises a value by another aggregate with a number format', async () => {
    const sheet = await pivotWith('Region', 'Amount');

    await sheet.pivot.chooseAction('Sum of Amount', 'Value field settings…');

    expect(sheet.pivot.focusedInput).toBe('Custom name');
    expect(sheet.pivot.value('Custom name')).toBe('Sum of Amount');

    await sheet.pivot.choose('Summarize by', 'Average');

    expect(sheet.pivot.value('Custom name')).toBe('Average of Amount');

    await sheet.pivot.choose('Number format', '#,##0.00 — 1,234.57');
    await sheet.pivot.applyEditor();

    expect(sheet.pivot.chips('Values')).toEqual(['Average of Amount']);
    expect(sheet.pivot.announcement).toBe('Average of Amount: settings applied');

    expect([sheet.text(3, 1), sheet.text(4, 1), sheet.text(6, 1)]).toEqual([
      'Average of Amount',
      '150.00',
      '150.00',
    ]);
  });

  it('keeps a custom name and refuses an empty or taken one', async () => {
    const sheet = await pivotWith('Region', 'Amount');

    await sheet.pivot.chooseAction('Sum of Amount', 'Value field settings…');
    await sheet.pivot.fill('Custom name', 'region');
    await sheet.pivot.applyEditor();

    expect(sheet.pivot.subview).toBe('Amount');

    expect(sheet.pivot.editorErrors).toEqual([
      'This name is already used by a field of the pivot table',
    ]);

    await sheet.pivot.fill('Custom name', ' ');

    expect(sheet.pivot.editorErrors).toEqual(['Enter a name']);

    await sheet.pivot.fill('Custom name', 'Revenue');
    await sheet.pivot.choose('Summarize by', 'Max');
    await sheet.pivot.applyEditor();

    expect(sheet.pivot.chips('Values')).toEqual(['Revenue']);
    expect([sheet.text(4, 1), sheet.text(5, 1)]).toEqual(['200', '150']);
  });

  it('shows values as a share of the total and as a difference from the previous item', async () => {
    const sheet = await pivotWith('Region', 'Amount');

    await sheet.pivot.chooseAction('Sum of Amount', 'Value field settings…');
    await sheet.pivot.choose('Show values as', '% of grand total');
    await sheet.pivot.applyEditor();

    expect(column(sheet, 1, 4, 6)).toEqual(['66.67%', '33.33%', '100.00%']);

    await sheet.pivot.chooseAction('Sum of Amount', 'Value field settings…');
    await sheet.pivot.choose('Show values as', 'Difference from');
    await sheet.pivot.choose('Base field', 'Region');
    await sheet.pivot.choose('Base item', '(previous)');
    await sheet.pivot.choose('Number format', 'General');
    await sheet.pivot.applyEditor();

    expect(column(sheet, 1, 4, 6)).toEqual(['East', '-150', 'Grand Total']);
  });
});
