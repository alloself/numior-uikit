import { describe, expect, it } from 'vite-plus/test';
import { RU_LOCALE, loadCells, numberValue, textValue, type LoadEntry } from '../src/core';
import { evaluated, openSheet } from './sheet-harness';

describe('formula evaluation', () => {
  it('computes operators with the Excel coercions', () => {
    expect(evaluated('=1+2*3')).toEqual(numberValue(7));
    expect(evaluated('=-2^2')).toEqual(numberValue(4));
    expect(evaluated('=50%')).toEqual(numberValue(0.5));
    expect(evaluated('="2"*3')).toEqual(numberValue(6));
    expect(evaluated('=TRUE+1')).toEqual(numberValue(2));
    expect(evaluated('="a"&1.5')).toEqual(textValue('a1.5'));
    expect(evaluated('=1/3&""')).toEqual(textValue('0.333333333333333'));
    expect(evaluated('=10^15&""')).toEqual(textValue('1E+15'));
    expect(evaluated('=A9')).toEqual(numberValue(0));
  });

  it('gives Excel errors for impossible operations', () => {
    expect(evaluated('=1/0')).toEqual({ kind: 'error', code: '#DIV/0!' });
    expect(evaluated('="x"+1')).toEqual({ kind: 'error', code: '#VALUE!' });
    expect(evaluated('=0^0')).toEqual({ kind: 'error', code: '#NUM!' });
    expect(evaluated('=(-8)^0.5')).toEqual({ kind: 'error', code: '#NUM!' });
    expect(evaluated('=#N/A+1/0')).toEqual({ kind: 'error', code: '#N/A' });
    expect(evaluated('=Nowhere!A1')).toEqual({ kind: 'error', code: '#REF!' });
    expect(evaluated('=Total')).toEqual({ kind: 'error', code: '#NAME?' });
  });

  it('intersects a range with the row or column of the formula through @', () => {
    const sheet = openSheet();

    ['A1', 'A2', 'A3'].forEach((address, index) => {
      sheet.enter(address, index + 1);
    });

    ['C1', 'D1', 'E1'].forEach((address, index) => {
      sheet.enter(address, (index + 1) * 10);
    });

    sheet.enter('B2', '=@A1:A3*2');
    sheet.enter('D3', '=@C1:E1');
    sheet.enter('B5', '=@A1:A3');
    sheet.enter('B6', '=@{7,8}');
    sheet.enter('B7', '=SINGLE(A1:A3)');
    sheet.recalc();

    expect(sheet.value('B2')).toEqual(numberValue(4));
    expect(sheet.value('D3')).toEqual(numberValue(20));
    expect(sheet.value('B5')).toEqual({ kind: 'error', code: '#VALUE!' });
    expect(sheet.value('B6')).toEqual(numberValue(7));
    expect(sheet.value('B7')).toEqual({ kind: 'error', code: '#VALUE!' });
  });

  it('compares numbers, texts and logicals in the Excel order', () => {
    expect(evaluated('=1<"a"')).toEqual({ kind: 'boolean', value: true });
    expect(evaluated('="a"<TRUE')).toEqual({ kind: 'boolean', value: true });
    expect(evaluated('="B">"a"')).toEqual({ kind: 'boolean', value: true });
    expect(evaluated('="abc"="ABC"')).toEqual({ kind: 'boolean', value: true });
    expect(evaluated('=A9=0')).toEqual({ kind: 'boolean', value: true });
    expect(evaluated('=A9=""')).toEqual({ kind: 'boolean', value: true });
  });
});

describe('base functions', () => {
  it('aggregates ranges and direct arguments', () => {
    const sheet = openSheet();

    sheet.enter('A1', 1);
    sheet.enter('A2', 'text');
    sheet.enter('A3', 3);
    sheet.enter('B1', '=SUM(A1:A3, "4", TRUE)');
    sheet.enter('B2', '=AVERAGE(A1:A3)');
    sheet.enter('B3', '=MIN(A:A)+MAX(A1:A3, 10)');
    sheet.enter('B4', '=COUNT(A1:A3, "5", "x")&"/"&COUNTA(A1:A3)');
    sheet.enter('B5', '=AVERAGE(C1:C3)');
    sheet.recalc();

    expect(sheet.value('B1')).toEqual(numberValue(9));
    expect(sheet.value('B2')).toEqual(numberValue(2));
    expect(sheet.value('B3')).toEqual(numberValue(11));
    expect(sheet.value('B4')).toEqual(textValue('3/3'));
    expect(sheet.value('B5')).toEqual({ kind: 'error', code: '#DIV/0!' });
  });

  it('rounds half away from zero and branches lazily', () => {
    expect(evaluated('=ROUND(2.5, 0)')).toEqual(numberValue(3));
    expect(evaluated('=ROUND(-2.5, 0)')).toEqual(numberValue(-3));
    expect(evaluated('=ROUND(1.005, 2)')).toEqual(numberValue(1.01));
    expect(evaluated('=ROUND(1234, -2)')).toEqual(numberValue(1200));
    expect(evaluated('=IF(TRUE, 1, 1/0)')).toEqual(numberValue(1));
    expect(evaluated('=IF(FALSE, 1)')).toEqual({ kind: 'boolean', value: false });
    expect(evaluated('=AND(TRUE, 1)')).toEqual({ kind: 'boolean', value: true });
    expect(evaluated('=OR(FALSE, 0)')).toEqual({ kind: 'boolean', value: false });
    expect(evaluated('=NOT(0)')).toEqual({ kind: 'boolean', value: true });
    expect(evaluated('=IFERROR(1/0, "none")')).toEqual(textValue('none'));
    expect(evaluated('=ABS(-4)')).toEqual(numberValue(4));
    expect(evaluated('=ROUND(1)')).toEqual({ kind: 'error', code: '#VALUE!' });
  });

  it('looks values up exactly and in sorted tables', () => {
    const sheet = openSheet();
    const rates = sheet.workbook.addSheet('Rates');

    sheet.enter('A1', 'apple', rates);
    sheet.enter('B1', 1.5, rates);
    sheet.enter('A2', 'Pear', rates);
    sheet.enter('B2', 2.25, rates);
    sheet.enter('C1', 0);
    sheet.enter('C2', 100);
    sheet.enter('D1', 'small');
    sheet.enter('D2', 'large');
    sheet.enter('E1', '=VLOOKUP("pear", Rates!A1:B2, 2, FALSE)');
    sheet.enter('E2', '=VLOOKUP(150, C1:D2, 2)');
    sheet.enter('E3', '=VLOOKUP("plum", Rates!A:B, 2, FALSE)');
    sheet.enter('E4', '=VLOOKUP(-1, C1:D2, 2)');
    sheet.enter('E5', '=VLOOKUP("apple", Rates!A1:B2, 3, FALSE)');
    sheet.recalc();

    expect(sheet.value('E1')).toEqual(numberValue(2.25));
    expect(sheet.value('E2')).toEqual(textValue('large'));
    expect(sheet.value('E3')).toEqual({ kind: 'error', code: '#N/A' });
    expect(sheet.value('E4')).toEqual({ kind: 'error', code: '#N/A' });
    expect(sheet.value('E5')).toEqual({ kind: 'error', code: '#REF!' });

    sheet.enter('B2', 3, rates);
    sheet.enter('A2', 'plum', rates);
    sheet.recalc();

    expect(sheet.value('E1')).toEqual({ kind: 'error', code: '#N/A' });
    expect(sheet.value('E3')).toEqual(numberValue(3));
  });

  it('answers #NAME? for unknown functions and reports them', () => {
    const sheet = openSheet();

    sheet.enter('A1', '=WEBSERVICE("https://numior.test")');
    sheet.recalc();

    expect(sheet.value('A1')).toEqual({ kind: 'error', code: '#NAME?' });
    expect(sheet.calculator.limitations).toEqual([{ kind: 'function', name: 'WEBSERVICE' }]);
  });
});

describe('recalculation', () => {
  it('follows chains in dependency order whatever order formulas were entered in', () => {
    const sheet = openSheet();

    for (let row = 100; row >= 2; row -= 1) {
      sheet.enter(`A${String(row)}`, `=A${String(row - 1)}+1`);
    }

    sheet.enter('A1', 1);
    sheet.recalc();

    expect(sheet.value('A100')).toEqual(numberValue(100));

    sheet.enter('A1', 10);
    sheet.recalc();

    expect(sheet.value('A100')).toEqual(numberValue(109));
    expect(sheet.calculator.pending).toBe(0);
  });

  it('updates ranges, whole columns and other sheets', () => {
    const sheet = openSheet();
    const other = sheet.workbook.addSheet('Data');

    sheet.enter('A1', 1);
    sheet.enter('A2', 2);
    sheet.enter('B1', '=SUM(A1:A2)');
    sheet.enter('B2', '=SUM(A:A)');
    sheet.enter('B3', '=Data!A1*2');
    sheet.recalc();
    sheet.enter('A2', 5);
    sheet.enter('A500000', 100);
    sheet.enter('A1', 4, other);
    sheet.recalc();

    expect(sheet.value('B1')).toEqual(numberValue(6));
    expect(sheet.value('B2')).toEqual(numberValue(106));
    expect(sheet.value('B3')).toEqual(numberValue(8));
  });

  it('marks circular references and keeps computing what depends on them', () => {
    const sheet = openSheet();

    sheet.enter('A1', '=B1+1');
    sheet.enter('B1', '=A1+1');
    sheet.enter('C1', '=A1+5');
    sheet.enter('D1', '=D1');
    sheet.recalc();

    expect([sheet.state('A1'), sheet.state('B1'), sheet.state('D1')]).toEqual([
      'cycle',
      'cycle',
      'cycle',
    ]);

    expect(sheet.value('A1')).toEqual(numberValue(0));
    expect(sheet.value('C1')).toEqual(numberValue(5));
    expect(sheet.state('C1')).toBe('fresh');

    sheet.enter('B1', 2);
    sheet.recalc();

    expect(sheet.value('A1')).toEqual(numberValue(3));
    expect(sheet.state('A1')).toBe('fresh');
  });

  it('computes in chunks, yields between them and finishes in the background', async () => {
    const sheet = openSheet();
    let yields = 0;

    sheet.enter('A1', 1);

    for (let row = 2; row <= 2000; row += 1) {
      sheet.enter(`A${String(row)}`, `=A${String(row - 1)}*1`);
    }

    const run = sheet.recalc({
      budgetMs: 0,
      yieldTo: () => {
        yields += 1;
        return Promise.resolve();
      },
    });

    expect(run.total).toBe(1999);
    expect(run.done).toBeLessThan(run.total);
    expect(sheet.state('A2000')).toBe('stale');

    await run.settled;

    expect(run.done).toBe(run.total);
    expect(yields).toBeGreaterThan(10);
    expect(sheet.value('A2000')).toEqual(numberValue(1));
    expect(sheet.state('A2000')).toBe('fresh');
  });

  it('plans a large recalculation across chunks before it computes', async () => {
    const sheet = openSheet();

    sheet.enter('A1', 1);

    for (let row = 2; row <= 20_000; row += 1) {
      sheet.enter(`A${String(row)}`, `=A${String(row - 1)}+1`);
    }

    const run = sheet.recalc({ budgetMs: 0, yieldTo: () => Promise.resolve() });

    expect(run.finished).toBe(false);
    expect(run.total).toBe(0);
    expect(run.done).toBe(0);

    await run.settled;

    expect(run.finished).toBe(true);
    expect(run.total).toBe(19_999);
    expect(run.done).toBe(19_999);
    expect(sheet.value('A20000')).toEqual(numberValue(20_000));
  });

  it('yields to the host on its own and counts only the time it spent computing', async () => {
    const sheet = openSheet();
    const started = performance.now();

    sheet.enter('A1', 1);

    for (let row = 2; row <= 2000; row += 1) {
      sheet.enter(`A${String(row)}`, `=A${String(row - 1)}+1`);
    }

    const run = sheet.recalc({ budgetMs: 0 });

    await run.settled;

    expect(run.done).toBe(run.total);
    expect(sheet.value('A2000')).toEqual(numberValue(2000));
    expect(run.busyMs).toBeGreaterThan(0);
    expect(run.busyMs).toBeLessThanOrEqual(performance.now() - started);
  });

  it('orders formulas by the references INDIRECT and OFFSET find while computing', () => {
    const sheet = openSheet();

    sheet.enter('A1', '=INDIRECT("B1")*2');
    sheet.enter('A2', '=SUM(OFFSET(B1,0,0,2,1))');
    sheet.enter('B1', '=C1+1');
    sheet.enter('B2', 5);
    sheet.enter('C1', 4);
    sheet.recalc();

    expect([sheet.value('A1'), sheet.value('A2')]).toEqual([numberValue(10), numberValue(10)]);

    sheet.enter('C1', 9);
    sheet.recalc({ budgetMs: Number.POSITIVE_INFINITY, volatile: false });

    expect([sheet.value('A1'), sheet.value('A2')]).toEqual([numberValue(20), numberValue(15)]);
    expect(sheet.calculator.pending).toBe(0);
  });

  it('computes the visible cells first', () => {
    const sheet = openSheet();

    for (let row = 2; row <= 1000; row += 1) {
      sheet.enter(`A${String(row)}`, `=A${String(row - 1)}+1`);
    }

    for (let row = 2; row <= 20; row += 1) {
      sheet.enter(`C${String(row)}`, `=C${String(row - 1)}+1`);
    }

    sheet.enter('D1', '=SUM(C1:C20)');

    sheet.recalc({
      budgetMs: 0,
      yieldTo: () => new Promise(() => undefined),
      viewport: { sheet: sheet.sheet, range: { top: 0, left: 3, bottom: 0, right: 3 } },
    });

    expect(sheet.value('D1')).toEqual(numberValue(190));
    expect(sheet.state('D1')).toBe('fresh');
    expect(sheet.state('A1000')).toBe('stale');
  });

  it('keeps unfinished work when an edit interrupts a run', async () => {
    const sheet = openSheet();

    sheet.enter('A1', 1);

    for (let row = 2; row <= 500; row += 1) {
      sheet.enter(`A${String(row)}`, `=A${String(row - 1)}+1`);
    }

    const run = sheet.recalc({ budgetMs: 0, yieldTo: () => Promise.resolve() });

    sheet.enter('B1', 7);
    await run.settled;

    expect(run.done).toBeLessThan(run.total);
    expect(sheet.calculator.pending).toBeGreaterThan(0);

    sheet.recalc();

    expect(sheet.value('A500')).toEqual(numberValue(500));
    expect(sheet.calculator.pending).toBe(0);
  });
});

describe('book locale', () => {
  it('reads formulas and texts in the locale and recomputes every formula when it changes', () => {
    const sheet = openSheet({ locale: RU_LOCALE });

    sheet.enter('A1', '=TEXT(1234,5;"# ##0,00")');
    sheet.enter('A2', '="1,5"+1');
    sheet.recalc();

    expect(sheet.value('A1')).toEqual(textValue('1 234,50'));
    expect(sheet.value('A2')).toEqual(numberValue(2.5));

    sheet.calculator.setLocale({ ...RU_LOCALE, numbers: { ...RU_LOCALE.numbers, group: '.' } });
    sheet.recalc();

    expect(sheet.value('A1')).toEqual(textValue('1.234,50'));
    expect(sheet.calculator.locale.numbers.group).toBe('.');
  });
});

describe('loading cells in slices', () => {
  it('enters values and formulas between yields and reports what did not parse', async () => {
    const sheet = openSheet();
    let yields = 0;

    const entries: LoadEntry[] = [
      ...Array.from({ length: 300 }, (_, row): LoadEntry => ({
        row,
        col: 0,
        value: numberValue(row),
      })),
      ...Array.from({ length: 300 }, (_, row): LoadEntry => ({
        row,
        col: 1,
        formula: `=A${String(row + 1)}*2`,
      })),
      { row: 0, col: 2, formula: '=1+' },
    ];

    const loading = loadCells(sheet.calculator, sheet.sheet, entries, {
      budgetMs: 0,
      yieldTo: async () => {
        yields += 1;
      },
    });

    expect(loading.done).toBeLessThan(loading.total);

    await loading.settled;
    sheet.recalc();

    expect(yields).toBeGreaterThan(1);
    expect(loading.done).toBe(601);
    expect(loading.failures).toEqual([{ position: 3, reason: 'end', row: 0, col: 2 }]);
    expect(sheet.value('B300')).toEqual(numberValue(598));
    expect(loading.longestMs).toBeGreaterThanOrEqual(0);
  });

  it('stops entering when cancelled', async () => {
    const sheet = openSheet();

    const loading = loadCells(
      sheet.calculator,
      sheet.sheet,
      Array.from({ length: 500 }, (_, row): LoadEntry => ({
        row,
        col: 0,
        value: numberValue(row),
      })),
      { budgetMs: 0, yieldTo: async () => undefined },
    );

    loading.cancel();
    await loading.settled;

    expect(loading.done).toBeLessThan(500);
  });
});
