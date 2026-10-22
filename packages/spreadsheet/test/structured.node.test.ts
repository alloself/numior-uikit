import { describe, expect, it } from 'vite-plus/test';
import { EN_FORMULAS, RU_FORMULAS, RU_LOCALE, parseFormula, printFormula } from '../src/core';
import { openBook } from './book-harness';

const reprinted = (formula: string, read = EN_FORMULAS, write = read): string => {
  const parsed = parseFormula(formula, read);

  return parsed.ok
    ? `=${printFormula(parsed.ast, write)}`
    : `failed at ${String(parsed.error.position)}`;
};

const withOrders = () => {
  const sheet = openBook();

  [
    ['A1', 'Item'],
    ['B1', 'Amount'],
    ['C1', 'Price'],
    ['A2', 'Pen'],
    ['B2', '2'],
    ['C2', '10'],
    ['A3', 'Ink'],
    ['B3', '3'],
    ['C3', '20'],
  ].forEach(([address = '', text = '']) => {
    sheet.type(address, text);
  });

  sheet.table('A1:C3', { name: 'Orders' });
  return sheet;
};

describe('structured references', () => {
  it('reads and prints the forms Excel writes', () => {
    expect(
      [
        '=Orders[Amount]',
        '=Orders[]',
        '=Orders[#All]',
        '=Orders[[#Headers],[Amount]]',
        '=Orders[[#Data],[#Totals]]',
        '=Orders[[Item]:[Amount]]',
        '=Orders[@Amount]',
        '=Orders[@[Unit Price]]',
        '=[@Amount]*2',
        "=Orders[[Q'#1]]",
        '=Orders[Unit Price]',
      ].map((formula) => reprinted(formula)),
    ).toEqual([
      '=Orders[Amount]',
      '=Orders[]',
      '=Orders[#All]',
      '=Orders[[#Headers],[Amount]]',
      '=Orders[[#Data],[#Totals]]',
      '=Orders[[Item]:[Amount]]',
      '=Orders[@Amount]',
      '=Orders[@[Unit Price]]',
      '=[@Amount]*2',
      "=Orders[[Q'#1]]",
      '=Orders[Unit Price]',
    ]);

    expect(reprinted('=Orders[[#This Row],[Amount]]')).toBe('=Orders[@Amount]');
    expect(reprinted('=Orders[ [#Totals] , [#Data] ]')).toBe('=Orders[[#Data],[#Totals]]');
    expect(reprinted('=Orders[[#Headers],[#Totals]]')).toBe('failed at 1');
    expect(reprinted('=Orders[[Amount]')).toBe('failed at 7');
  });

  it('reads and prints the Russian special items with the Russian separator', () => {
    expect(reprinted('=Таблица1[[#Заголовки];[Сумма]]', RU_FORMULAS)).toBe(
      '=Таблица1[[#Заголовки];[Сумма]]',
    );

    expect(reprinted('=Таблица1[[#Заголовки];[Сумма]]', RU_FORMULAS, EN_FORMULAS)).toBe(
      '=Таблица1[[#Headers],[Сумма]]',
    );

    expect(reprinted('=Т[[#Эта строка];[Сумма]]', RU_FORMULAS)).toBe('=Т[@Сумма]');
    expect(reprinted('=Т[#Итоги]', RU_FORMULAS, EN_FORMULAS)).toBe('=Т[#Totals]');
  });

  it('reads columns, headers, whole tables and the row of the formula', () => {
    const sheet = withOrders();

    sheet.type('E1', '=SUM(Orders[Amount])');
    sheet.type('E2', '=Orders[[#Headers],[Price]]');
    sheet.type('E3', '=COUNTA(Orders[#All])');
    sheet.type('E4', '=SUM(Orders[[Amount]:[Price]])');
    sheet.type('D2', '=Orders[@Amount]*Orders[@Price]');
    sheet.type('D3', '=Orders[@Amount]*Orders[@Price]');
    sheet.type('D4', '=Orders[@Amount]');
    sheet.type('E5', '=Orders[#Totals]');
    sheet.type('E6', '=Orders[Missing]');
    sheet.type('E7', '=Missing[Amount]');

    expect(
      ['E1', 'E2', 'E3', 'E4', 'D2', 'D3', 'D4', 'E5', 'E6', 'E7'].map((address) =>
        sheet.shown(address),
      ),
    ).toEqual(['5', 'Price', '9', '35', '20', '60', '#VALUE!', '#REF!', '#REF!', '#REF!']);

    sheet.type('B2', '4');

    expect(['E1', 'D2'].map((address) => sheet.shown(address))).toEqual(['7', '40']);
  });

  it('reads the table of the formula cell when the reference names none', () => {
    const sheet = withOrders();

    sheet.type('D1', 'Total');

    sheet.commit({
      kind: 'setTable',
      name: 'Orders',
      table: {
        sheet: 'Sheet1',
        range: { top: 0, left: 0, bottom: 2, right: 3 },
        columns: ['Item', 'Amount', 'Price', 'Total'],
        headers: true,
        totals: false,
      },
    });

    sheet.type('D2', '=[@Amount]*[@Price]');
    sheet.type('D3', '=[@Amount]*[@Price]');
    sheet.type('F1', '=[@Amount]');

    expect(['D2', 'D3', 'F1'].map((address) => sheet.shown(address))).toEqual([
      '20',
      '60',
      '#REF!',
    ]);
  });

  it('follows a renamed column in every formula and back on undo', () => {
    const sheet = withOrders();

    sheet.type('E1', '=SUM(Orders[Amount])');
    sheet.type('D2', '=Orders[@Amount]*2');
    sheet.name('Units', '=Orders[[#Data],[Amount]]');
    sheet.type('E3', '=Orders[[#Headers],[Amount]]');

    expect(sheet.shown('E3')).toBe('Amount');

    sheet.type('B1', 'Qty');

    expect([sheet.input('E3'), sheet.shown('E3')]).toEqual(['=Orders[[#Headers],[Qty]]', 'Qty']);

    expect([sheet.input('E1'), sheet.input('D2'), sheet.definition('Units')]).toEqual([
      '=SUM(Orders[Qty])',
      '=Orders[@Qty]*2',
      '=Orders[Qty]',
    ]);

    expect(sheet.shown('E1')).toBe('5');

    sheet.history.undo();

    expect([sheet.input('E1'), sheet.input('D2'), sheet.definition('Units')]).toEqual([
      '=SUM(Orders[Amount])',
      '=Orders[@Amount]*2',
      '=Orders[Amount]',
    ]);
  });

  it('breaks references to deleted columns and tables and restores them on undo', () => {
    const sheet = withOrders();

    sheet.type('E1', '=SUM(Orders[Amount])');
    sheet.type('E2', '=SUM(Orders[Price])');
    sheet.remove('B');

    expect([sheet.input('D1'), sheet.input('D2')]).toEqual(['=SUM(#REF!)', '=SUM(Orders[Price])']);
    expect(sheet.shown('D2')).toBe('30');

    sheet.history.undo();

    expect([sheet.input('E1'), sheet.shown('E1')]).toEqual(['=SUM(Orders[Amount])', '5']);

    sheet.remove('1');

    expect(sheet.input('E1')).toBe('=SUM(#REF!)');

    sheet.history.undo();

    expect([sheet.input('E1'), sheet.shown('E1')]).toEqual(['=SUM(Orders[Amount])', '5']);
  });

  it('renames the table inside structured references and grows them with the table', () => {
    const sheet = withOrders();

    sheet.type('E1', '=SUM(Orders[Amount])');
    sheet.commit({ kind: 'renameTable', from: 'Orders', to: 'Sales' });

    expect(sheet.input('E1')).toBe('=SUM(Sales[Amount])');

    sheet.insert('3');
    sheet.type('B3', '5');

    expect(sheet.shown('E1')).toBe('10');
  });

  it('reads Russian structured references in a Russian book', () => {
    const sheet = openBook(RU_LOCALE);

    sheet.type('A1', 'Сумма');
    sheet.type('A2', '7');
    sheet.table('A1:A2');
    sheet.type('C1', '=Таблица1[[#Заголовки];[Сумма]]');
    sheet.type('C2', '=SUM(Таблица1[Сумма])');

    expect([sheet.shown('C1'), sheet.shown('C2')]).toEqual(['Сумма', '7']);
    expect(sheet.input('C1')).toBe('=Таблица1[[#Заголовки];[Сумма]]');
  });
});
