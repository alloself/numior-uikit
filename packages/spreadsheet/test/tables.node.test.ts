import { describe, expect, it } from 'vite-plus/test';
import { RU_LOCALE } from '../src/core';
import { openBook } from './book-harness';

const withSales = (locale = RU_LOCALE) => {
  const sheet = openBook(locale);

  sheet.type('A1', 'Item');
  sheet.type('B1', 'Amount');
  sheet.type('A2', 'Pen');
  sheet.type('B2', '3');
  sheet.type('A3', 'Ink');
  sheet.type('B3', '4');
  return sheet;
};

describe('tables', () => {
  it('makes a table from a range and keeps its column names unique', () => {
    const sheet = withSales();

    sheet.type('D1', 'amount');
    sheet.table('A1:D3');

    expect(sheet.tableOf('Таблица1')).toEqual({
      name: 'Таблица1',
      sheet: 'Sheet1',
      range: 'A1:D3',
      columns: 'Item, Amount, Столбец1, amount2',
      headers: true,
      totals: false,
    });

    expect(sheet.shown('C1')).toBe('Столбец1');
    expect(sheet.shown('D1')).toBe('amount2');

    sheet.history.undo();

    expect(sheet.tableOf('Таблица1')).toBeUndefined();
    expect(sheet.shown('C1')).toBe('');
    expect(sheet.shown('D1')).toBe('amount');
  });

  it('reads the table name as its data rows and follows the table when it appears', () => {
    const sheet = withSales();

    sheet.type('A1', '=SUM(Sales)', 'Rates');

    expect(sheet.shown('A1', 'Rates')).toBe('#NAME?');

    sheet.table('A1:B3', { name: 'Sales' });

    expect(sheet.shown('A1', 'Rates')).toBe('7');

    sheet.type('B2', '5');

    expect(sheet.shown('A1', 'Rates')).toBe('9');

    sheet.history.undo();
    sheet.history.undo();

    expect(sheet.shown('A1', 'Rates')).toBe('#NAME?');
  });

  it('renames a column when its header cell changes', () => {
    const sheet = withSales();

    sheet.table('A1:B3');
    sheet.type('B1', 'Item');

    expect(sheet.tableOf('Таблица1')?.columns).toBe('Item, Item2');
    expect(sheet.shown('B1')).toBe('Item2');

    sheet.type('B1', '');

    expect(sheet.tableOf('Таблица1')?.columns).toBe('Item, Столбец1');

    sheet.type('B1', '42');

    expect(sheet.tableOf('Таблица1')?.columns).toBe('Item, 42');
    expect(sheet.input('B1')).toBe("'42");

    sheet.history.undo();
    sheet.history.undo();
    sheet.history.undo();

    expect(sheet.tableOf('Таблица1')?.columns).toBe('Item, Amount');
    expect(sheet.shown('B1')).toBe('Amount');
  });

  it('grows with rows inserted inside, moves with rows above and shrinks with deleted rows', () => {
    const sheet = withSales();

    sheet.table('A1:B3', { name: 'Sales' });
    sheet.type('A1', '=SUM(Sales)', 'Rates');
    sheet.insert('3');
    sheet.type('B3', '10');

    expect(sheet.tableOf('Sales')?.range).toBe('A1:B4');
    expect(sheet.shown('A1', 'Rates')).toBe('17');

    sheet.insert('1');

    expect(sheet.tableOf('Sales')?.range).toBe('A2:B5');

    sheet.remove('3');

    expect(sheet.tableOf('Sales')?.range).toBe('A2:B4');
    expect(sheet.shown('A1', 'Rates')).toBe('14');

    sheet.history.undo();

    expect(sheet.tableOf('Sales')?.range).toBe('A2:B5');
    expect(sheet.shown('A1', 'Rates')).toBe('17');

    sheet.history.undo();
    sheet.history.undo();
    sheet.history.undo();

    expect(sheet.tableOf('Sales')?.range).toBe('A1:B3');
    expect(sheet.shown('A1', 'Rates')).toBe('7');
  });

  it('goes away with its header row or its last data row and comes back on undo', () => {
    const sheet = withSales();

    sheet.table('A1:B3', { name: 'Sales' });
    sheet.type('A1', '=SUM(Sales)', 'Rates');
    sheet.remove('1');

    expect(sheet.tableOf('Sales')).toBeUndefined();
    expect(sheet.input('A1', 'Rates')).toBe('=SUM(#REF!)');

    sheet.history.undo();

    expect(sheet.tableOf('Sales')?.range).toBe('A1:B3');
    expect(sheet.input('A1', 'Rates')).toBe('=SUM(Sales)');
    expect(sheet.shown('A1', 'Rates')).toBe('7');

    sheet.remove('2', 2);

    expect(sheet.tableOf('Sales')).toBeUndefined();

    sheet.history.undo();

    expect(sheet.tableOf('Sales')?.columns).toBe('Item, Amount');
    expect(sheet.shown('A1', 'Rates')).toBe('7');
  });

  it('names columns inserted inside the table and forgets deleted ones', () => {
    const sheet = withSales();

    sheet.table('A1:B3');
    sheet.insert('B');

    expect(sheet.tableOf('Таблица1')).toMatchObject({
      range: 'A1:C3',
      columns: 'Item, Столбец1, Amount',
    });

    expect(sheet.shown('B1')).toBe('Столбец1');

    sheet.insert('A');

    expect(sheet.tableOf('Таблица1')?.range).toBe('B1:D3');

    sheet.remove('C');

    expect(sheet.tableOf('Таблица1')).toMatchObject({ range: 'B1:C3', columns: 'Item, Amount' });

    sheet.history.undo();

    expect(sheet.tableOf('Таблица1')?.columns).toBe('Item, Столбец1, Amount');
    expect(sheet.shown('C1')).toBe('Столбец1');

    sheet.history.undo();
    sheet.history.undo();

    expect(sheet.tableOf('Таблица1')).toMatchObject({ range: 'A1:B3', columns: 'Item, Amount' });
  });

  it('refuses taken names, overlaps and tables without data rows', () => {
    const sheet = withSales();

    sheet.name('Rate', '=1');

    expect(sheet.table('A1:B3', { name: 'rate' })).toEqual({ ok: false, reason: 'name-taken' });
    expect(sheet.table('A1:B3', { name: 'B2' })).toEqual({ ok: false, reason: 'invalid-name' });
    expect(sheet.table('A1:B1')).toEqual({ ok: false, reason: 'invalid-table' });
    expect(sheet.shown('A1')).toBe('Item');
    expect(sheet.table('A1:B3').ok).toBe(true);
    expect(sheet.table('B2:C4')).toEqual({ ok: false, reason: 'table-overlap' });
    expect(sheet.table('D1:E3', { name: 'таблица1' })).toEqual({ ok: false, reason: 'name-taken' });
    expect(sheet.name('Таблица1', '=2')).toEqual({ ok: false, reason: 'name-taken' });
  });

  it('renames a table in formulas and names and back on undo', () => {
    const sheet = withSales();

    sheet.table('A1:B3');
    sheet.type('D1', '=SUM(Таблица1)');
    sheet.name('Total', '=SUM(Таблица1)*2');
    sheet.type('D2', '=Total');

    expect(sheet.commit({ kind: 'renameTable', from: 'таблица1', to: 'Sales' }).ok).toBe(true);
    expect(sheet.input('D1')).toBe('=SUM(Sales)');
    expect(sheet.definition('Total')).toBe('=SUM(Sales)*2');
    expect(sheet.shown('D2')).toBe('14');

    expect(sheet.commit({ kind: 'renameTable', from: 'Sales', to: 'Total' })).toEqual({
      ok: false,
      reason: 'name-taken',
    });

    sheet.history.undo();

    expect(sheet.input('D1')).toBe('=SUM(Таблица1)');
    expect(sheet.tableOf('Sales')).toBeUndefined();
    expect(sheet.shown('D1')).toBe('7');
  });

  it('drops the tables of a removed sheet and restores them', () => {
    const sheet = openBook();

    sheet.type('A1', 'Item', 'Rates');
    sheet.type('B1', 'Amount', 'Rates');
    sheet.type('B2', '5', 'Rates');
    sheet.table('A1:B2', undefined, 'Rates');
    sheet.type('A1', '=SUM(Table1)*2');

    expect(sheet.shown('A1')).toBe('10');

    sheet.commit({ kind: 'removeSheet', name: 'Rates' });

    expect(sheet.tableOf('Table1')).toBeUndefined();
    expect(sheet.input('A1')).toBe('=SUM(#REF!)*2');

    sheet.history.undo();

    expect(sheet.tableOf('Table1')?.sheet).toBe('Rates');
    expect(sheet.input('A1')).toBe('=SUM(Table1)*2');
    expect(sheet.shown('A1')).toBe('10');
  });

  it('makes a table without a header row from generated column names', () => {
    const sheet = openBook();

    sheet.type('A1', '2');
    sheet.type('A2', '3');
    sheet.table('A1:B2', { headers: false });
    sheet.type('D1', '=SUM(Table1)');

    expect(sheet.tableOf('Table1')).toMatchObject({ columns: 'Column1, Column2', headers: false });
    expect(sheet.shown('A1')).toBe('2');
    expect(sheet.shown('D1')).toBe('5');
  });
});
