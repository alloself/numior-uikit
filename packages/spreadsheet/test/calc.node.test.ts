import { describe, expect, it } from 'vite-plus/test';
import {
  RU_LOCALE,
  errorValue,
  loadCells,
  numberValue,
  textValue,
  type LoadEntry,
} from '../src/core';
import { openBook } from './book-harness';
import { evaluated, openSheet } from './sheet-harness';

const STALE_CALLS = 10_000;

const RUNNING_ROWS = 4000;

const RUNNING_BUDGET_MS = 400;

const STALE_BUDGET_MS = 20;

const LONG_ROWS = 150_000;

const MANY_ROWS = 100_000;

const MANY_ROWS_TIMEOUT_MS = 30_000;

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

  it('compares numbers by the fifteen digits a cell can show', () => {
    expect(evaluated('=0.1+0.2=0.3')).toEqual({ kind: 'boolean', value: true });
    expect(evaluated('=0.1+0.2>0.3')).toEqual({ kind: 'boolean', value: false });
    expect(evaluated('=0.1+0.2<>0.3')).toEqual({ kind: 'boolean', value: false });
    expect(evaluated('=1.1-1<=0.1')).toEqual({ kind: 'boolean', value: true });
    expect(evaluated('=1E+300*3=3E+300')).toEqual({ kind: 'boolean', value: true });
    expect(evaluated('=0.3=0.300000000000001')).toEqual({ kind: 'boolean', value: false });
    expect(evaluated('=1E-20=0')).toEqual({ kind: 'boolean', value: false });
    expect(evaluated('=SWITCH(0.1+0.2,0.3,"found","missed")')).toEqual(textValue('found'));
  });

  it('looks a value up and counts by the stored number, not by the shown digits', () => {
    const sheet = openSheet();

    sheet.enter('A1', '=0.1+0.2');
    sheet.enter('A2', 0.5);
    sheet.enter('B1', '=MATCH(0.3,A1:A2,0)');
    sheet.enter('B2', '=MATCH(0.5,A1:A2,0)');
    sheet.enter('B3', '=COUNTIF(A1:A2,0.3)');
    sheet.enter('B4', '=A1=0.3');
    sheet.recalc();

    expect(sheet.value('B1')).toEqual({ kind: 'error', code: '#N/A' });
    expect(sheet.value('B2')).toEqual(numberValue(2));
    expect(sheet.value('B3')).toEqual(numberValue(0));
    expect(sheet.value('B4')).toEqual({ kind: 'boolean', value: true });
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

  it.each([
    '=INDEX(E7:F8,1,1)',
    '=INDEX(E7:F8,1,1)+1',
    '=OFFSET(E8,-1,0)',
    '=INDIRECT("E7")',
    '=E7+1',
  ])(
    'gives %s that reaches its own cell the same circular value over an old number and over an empty cell',
    (formula) => {
      const over = openSheet();
      const empty = openSheet();

      over.enter('E7', 4);
      over.recalc();
      over.enter('E7', formula);
      empty.enter('E7', formula);
      over.recalc();
      empty.recalc();

      expect([over.value('E7'), over.state('E7')]).toEqual([numberValue(0), 'cycle']);
      expect([empty.value('E7'), empty.state('E7')]).toEqual([numberValue(0), 'cycle']);
    },
  );

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

  it('takes extremes and the mode of a column too long to spread into a call', () => {
    const sheet = openSheet();

    for (let row = 1; row <= LONG_ROWS; row += 1) {
      sheet.enter(`A${String(row)}`, row);
    }

    sheet.enter(`A${String(LONG_ROWS + 1)}`, 7);
    sheet.enter('C1', `=MAXIFS(A1:A${String(LONG_ROWS)},A1:A${String(LONG_ROWS)},">0")`);
    sheet.enter('C2', `=MINIFS(A1:A${String(LONG_ROWS)},A1:A${String(LONG_ROWS)},">0")`);
    sheet.enter('C3', `=SUBTOTAL(4,A1:A${String(LONG_ROWS)})`);
    sheet.enter('C4', `=SUBTOTAL(5,A1:A${String(LONG_ROWS)})`);
    sheet.enter('C5', `=MODE(A1:A${String(LONG_ROWS + 1)})`);

    sheet.recalc();

    expect(['C1', 'C2', 'C3', 'C4', 'C5'].map((address) => sheet.value(address))).toEqual([
      numberValue(LONG_ROWS),
      numberValue(1),
      numberValue(LONG_ROWS),
      numberValue(1),
      numberValue(7),
    ]);
  });

  it(
    'finds exact matches in ranges that grow down a column within the budget',
    { tags: ['budget'] },
    () => {
      const sheet = openSheet();

      for (let row = 1; row <= RUNNING_ROWS; row += 1) {
        sheet.enter(`A${String(row)}`, `key${String(row)}`);
        sheet.enter(`B${String(row)}`, `=MATCH("key${String(row)}",$A$1:A${String(row)},0)`);
      }

      const started = performance.now();

      sheet.recalc();

      const spent = performance.now() - started;

      expect([sheet.value('B1'), sheet.value(`B${String(RUNNING_ROWS)}`)]).toEqual([
        numberValue(1),
        numberValue(RUNNING_ROWS),
      ]);

      expect(spent).toBeLessThan(RUNNING_BUDGET_MS);
    },
  );

  it('finds the same rows by the column index as by reading the cells one by one', () => {
    const sheet = openSheet();

    ['pear', 'Apple', 'plum', 'apple', 7, true, 'p*m'].forEach((input, index) => {
      sheet.enter(`A${String(index + 1)}`, input);
      sheet.enter(`B${String(index + 1)}`, index * 10);
    });

    [
      '=MATCH("APPLE",A1:A7,0)',
      '=MATCH("p*m",A1:A7,0)',
      '=XMATCH("p*m",A1:A7)',
      '=XMATCH("apple",A1:A7,0,-1)',
      '=XMATCH(7,A1:A7)',
      '=XLOOKUP(TRUE,A1:A7,B1:B7)',
      '=XLOOKUP("fig",A1:A7,B1:B7,"none")',
      '=MATCH("7",A1:A7,0)',
    ].forEach((formula, index) => {
      sheet.enter(`D${String(index + 1)}`, formula);
    });

    sheet.recalc();

    expect(sheet.grid('D1:D8')).toEqual([[2], [3], [7], [4], [5], [50], ['none'], ['#N/A']]);
  });

  it('does not find a value below the end of a shorter range with the same start', () => {
    const sheet = openSheet();

    ['a', 'b', 'c', 'b', 'e'].forEach((text, index) => {
      sheet.enter(`A${String(index + 1)}`, text);
    });

    sheet.enter('C1', '=MATCH("e",A1:A5,0)');
    sheet.enter('C2', '=MATCH("e",A1:A3,0)');
    sheet.enter('C3', '=MATCH("b",A1:A5,0)');
    sheet.enter('C4', '=MATCH("e",A1:A4,0)');
    sheet.recalc();

    expect(sheet.grid('C1:C4')).toEqual([[5], ['#N/A'], [2], ['#N/A']]);

    sheet.enter('A2', 'e');
    sheet.recalc();

    expect(sheet.grid('C1:C4')).toEqual([[2], [2], [4], [2]]);
  });

  it(
    'tells which formulas wait for a value without planning the run again',
    { tags: ['budget'] },
    async () => {
      const sheet = openSheet();

      sheet.enter('A1', 1);
      sheet.enter('B1', 5);

      for (let row = 2; row <= 40_000; row += 1) {
        sheet.enter(`A${String(row)}`, `=A${String(row - 1)}+1`);
      }

      const run = sheet.recalc({ budgetMs: 0, yieldTo: () => Promise.resolve() });
      const early = [run.planned, ...['A2', 'A40000', 'A1', 'B1'].map(sheet.stale)];
      const started = performance.now();

      for (let call = 0; call < STALE_CALLS; call += 1) {
        sheet.stale('A40000');
      }

      const spent = performance.now() - started;

      await run.settled;

      expect(early).toEqual([false, true, true, false, false]);
      expect([run.planned, sheet.stale('A2'), sheet.stale('A40000')]).toEqual([true, false, false]);
      expect(spent).toBeLessThan(STALE_BUDGET_MS);
    },
  );

  it('marks every formula left without a value when a run is stopped', async () => {
    const sheet = openSheet();

    sheet.enter('A1', 1);

    for (let row = 2; row <= 40_000; row += 1) {
      sheet.enter(`A${String(row)}`, `=A${String(row - 1)}+1`);
    }

    const run = sheet.recalc({ budgetMs: 0, yieldTo: () => Promise.resolve() });

    run.cancel();
    await run.settled;

    expect([run.planned, run.done, sheet.stale('A40000'), sheet.state('A40000')]).toEqual([
      true,
      0,
      true,
      'stale',
    ]);
  });

  it(
    'yields to the host on its own and counts only the time it spent computing',
    { tags: ['budget'] },
    async () => {
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
    },
  );

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

describe('ranges a criteria function reads', () => {
  it('sums and averages a sum range stretched to the criteria range and follows its cells', () => {
    const sheet = openSheet();

    ['B1', 'B2', 'B3'].forEach((address) => sheet.enter(address, 1));
    sheet.enter('C1', 10);
    sheet.enter('C2', 20);
    sheet.enter('C3', 30);
    sheet.enter('H1', '=SUMIF(B1:B3,">0",C1)');
    sheet.enter('H2', '=AVERAGEIF(B1:B3,">0",C1)');
    sheet.enter('H3', '=SUMIF(B1:B3,">0",C1:D9)');
    sheet.recalc();

    expect([sheet.value('H1'), sheet.value('H2'), sheet.value('H3')]).toEqual([
      numberValue(60),
      numberValue(20),
      numberValue(60),
    ]);

    sheet.enter('C2', 200);
    sheet.recalc();

    expect([sheet.value('H1'), sheet.value('H2'), sheet.value('H3')]).toEqual([
      numberValue(240),
      numberValue(80),
      numberValue(240),
    ]);
  });

  it('gives a sum range stretched over its own cell the circular value', () => {
    const sheet = openSheet();

    sheet.enter('D7', 1);
    sheet.enter('E7', 1);
    sheet.enter('F7', '=SUMIF(B:E,">0",C:C)');
    sheet.recalc();
    sheet.enter('B1', 0);
    sheet.recalc();

    expect([sheet.value('F7'), sheet.state('F7')]).toEqual([numberValue(0), 'cycle']);
  });

  it.each([
    '=SUMIFS(C1:C1,B1:B3,">0")',
    '=SUMIFS(C1:C5,B1:B3,">0")',
    '=AVERAGEIFS(C1:C1,B1:B3,">0")',
    '=MAXIFS(C1:C1,B1:B3,">0")',
    '=MINIFS(C1:C1,B1:B3,">0")',
  ])('refuses %s whose range differs in shape from its criteria range', (formula) => {
    expect(evaluated(formula)).toEqual(errorValue('#VALUE!'));
  });
});

describe('book locale', () => {
  it('reads formulas and texts in the locale and recomputes every formula when it changes', () => {
    const sheet = openSheet({ locale: RU_LOCALE });

    sheet.enter('A1', '=TEXT(1234,5;"# ##0,00")');
    sheet.enter('A2', '="1,5"+1');
    sheet.recalc();

    expect(sheet.value('A1')).toEqual(textValue('1 234,50'));
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

describe('whole lines after an insert before them', () => {
  it('brings back the references an insert has pushed off the sheet when it is undone', () => {
    const sheet = openBook();

    sheet.type('B1', '=SUM(A1048575:A1048576)');
    sheet.type('C1', '=A1048576');
    sheet.type('A1', '=Sheet1!XFD1+SUM(Sheet1!XFC1:XFD1)', 'Rates');
    sheet.name('Tail', '=Sheet1!$A$1048576');
    sheet.insert('1');

    expect(sheet.input('B2')).toBe('=SUM(A1048576:A1048576)');
    expect(sheet.input('C2')).toBe('=#REF!');

    sheet.history.undo();

    expect(sheet.input('B1')).toBe('=SUM(A1048575:A1048576)');
    expect(sheet.input('C1')).toBe('=A1048576');
    expect(sheet.definition('Tail')).toBe('=Sheet1!$A$1048576');

    sheet.insert('A');
    sheet.history.undo();

    expect(sheet.input('A1', 'Rates')).toBe('=Sheet1!XFD1+SUM(Sheet1!XFC1:XFD1)');
  });

  it('keeps summing a whole column when rows are inserted at the top', () => {
    const sheet = openBook();

    sheet.type('A2', '5');
    sheet.type('C1', '=SUM(A:A)');
    sheet.type('A1', '=SUM(Sheet1!A:A)', 'Rates');

    expect(sheet.shown('C1')).toBe('5');
    expect(sheet.shown('A1', 'Rates')).toBe('5');

    sheet.insert('1');
    sheet.type('A1', '100');

    expect(sheet.input('C2')).toBe('=SUM(A:A)');
    expect(sheet.shown('C2')).toBe('105');
    expect(sheet.shown('A1', 'Rates')).toBe('105');
  });

  it('keeps summing a whole row when columns are inserted at the start', () => {
    const sheet = openBook();

    sheet.type('B2', '10');
    sheet.type('F6', '=SUM(2:2)');

    expect(sheet.shown('F6')).toBe('10');

    sheet.insert('A');
    sheet.type('A2', '100');

    expect(sheet.shown('G6')).toBe('110');
  });
});

describe('settling only what a range shows', () => {
  it('settles the formulas the range reads and leaves the others to the next recalculation', () => {
    const sheet = openBook();

    sheet.type('A1', '1');
    sheet.type('B1', '=A1*2');
    sheet.type('C1', '=A1*3');

    expect(sheet.shown('C1')).toBe('3');

    sheet.type('A1', '5');
    sheet.settleFor('B1:B1');

    expect([sheet.seen('B1'), sheet.seen('C1'), sheet.calculator.pending > 0]).toEqual([
      '10',
      '3',
      true,
    ]);

    expect(sheet.shown('C1')).toBe('15');
  });

  it('leaves waiting a formula outside the range that reads a formula the range settled', () => {
    const sheet = openBook();

    sheet.type('A1', '1');
    sheet.type('B1', '=A2*2');

    expect(sheet.shown('B1')).toBe('0');

    sheet.type('A2', '=A1+1');
    sheet.settleFor('A1:A2');

    expect([sheet.seen('A2'), sheet.calculator.pending]).toEqual(['2', 1]);
    expect(sheet.shown('B1')).toBe('4');
  });

  it('settles an array that spills into the range from above it', () => {
    const sheet = openBook();

    sheet.type('A1', '3');
    sheet.type('B1', '=SEQUENCE(A1)');

    expect(sheet.shown('B3')).toBe('3');

    sheet.type('A1', '5');
    sheet.settleFor('B4:B6');

    expect([sheet.seen('B4'), sheet.seen('B5')]).toEqual(['4', '5']);
  });

  it('settles a chain of formulas on another sheet that the range reads', () => {
    const sheet = openBook();

    sheet.type('A1', '2', 'Rates');
    sheet.type('B1', '=A1*10', 'Rates');
    sheet.type('A1', '=Rates!B1+1');

    expect(sheet.shown('A1')).toBe('21');

    sheet.type('A1', '3', 'Rates');
    sheet.settleFor('A1:A1');

    expect(sheet.seen('A1')).toBe('31');
  });

  it('settles an array on another sheet that grows over a cell the range reads', () => {
    const sheet = openBook();

    sheet.type('Z1', '3', 'Rates');
    sheet.type('A1', '=SEQUENCE(Z1)', 'Rates');
    sheet.type('A1', '=Rates!A5*2');

    expect(sheet.shown('A1')).toBe('0');

    sheet.type('Z1', '6', 'Rates');
    sheet.settleFor('A1:A1');

    expect(sheet.seen('A1')).toBe('10');
  });

  it('settles a formula that an INDIRECT in the range starts to read', () => {
    const sheet = openBook();

    sheet.type('B1', '=A1*2', 'Rates');
    sheet.type('A2', '1', 'Rates');
    sheet.type('B2', '=A2*5', 'Rates');
    sheet.type('Z1', '1');
    sheet.type('A1', '=INDIRECT("Rates!B"&Z1)');

    expect(sheet.shown('A1')).toBe('0');

    sheet.type('A2', '2', 'Rates');
    sheet.type('Z1', '2');
    sheet.settleFor('A1:A1');

    expect(sheet.seen('A1')).toBe('10');
  });
});

describe('values after lines move', () => {
  it('sums a whole column again after a row with a value is deleted', () => {
    const sheet = openBook();

    sheet.type('A2', '3');
    sheet.type('A6', '4');
    sheet.type('C1', '=SUM(A:A)');
    sheet.type('D9', '=SUM(A:A)');
    sheet.type('A1', '=SUM(Sheet1!A:A)', 'Rates');

    expect(sheet.shown('C1')).toBe('7');

    sheet.remove('6');

    expect(sheet.shown('C1')).toBe('3');
    expect(sheet.shown('D8')).toBe('3');
    expect(sheet.shown('A1', 'Rates')).toBe('3');
  });

  it('sums a whole row again after a column with a value is deleted', () => {
    const sheet = openBook();

    sheet.type('B2', '3');
    sheet.type('E2', '4');
    sheet.type('A1', '=SUM(Sheet1!2:2)', 'Rates');

    expect(sheet.shown('A1', 'Rates')).toBe('7');

    sheet.remove('E');

    expect(sheet.shown('A1', 'Rates')).toBe('3');
  });

  it('counts and finds in a whole column again after rows move under it', () => {
    const sheet = openBook();

    sheet.type('A2', '3');
    sheet.type('A6', '4');
    sheet.type('A1', '=COUNTIF(Sheet1!A:A,">0")', 'Rates');
    sheet.type('A2', '=MATCH(4,Sheet1!A:A,0)', 'Rates');
    sheet.type('A3', '=INDEX(Sheet1!A:A,6)', 'Rates');

    expect([
      sheet.shown('A1', 'Rates'),
      sheet.shown('A2', 'Rates'),
      sheet.shown('A3', 'Rates'),
    ]).toEqual(['2', '6', '4']);

    sheet.insert('1');

    expect([sheet.shown('A2', 'Rates'), sheet.shown('A3', 'Rates')]).toEqual(['7', '0']);

    sheet.remove('3');

    expect([sheet.shown('A1', 'Rates'), sheet.shown('A2', 'Rates')]).toEqual(['1', '6']);
  });

  it('sums a name over a whole column again after a row with a value is deleted', () => {
    const sheet = openBook();

    sheet.type('A2', '3');
    sheet.type('A6', '4');
    sheet.name('Total', '=Sheet1!$A:$A');
    sheet.type('A1', '=SUM(Total)', 'Rates');

    expect(sheet.shown('A1', 'Rates')).toBe('7');

    sheet.remove('6');

    expect(sheet.shown('A1', 'Rates')).toBe('3');
  });

  it('reads again a cell that OFFSET and INDIRECT find after rows are inserted above it', () => {
    const sheet = openBook();

    sheet.type('A5', '4');
    sheet.type('A1', '=OFFSET(Sheet1!A1,4,0)', 'Rates');
    sheet.type('A2', '=INDIRECT("Sheet1!A5")', 'Rates');

    expect([sheet.settled('A1', 'Rates'), sheet.settled('A2', 'Rates')]).toEqual(['4', '4']);

    sheet.insert('3');

    expect([sheet.settled('A1', 'Rates'), sheet.settled('A2', 'Rates')]).toEqual(['0', '0']);
  });

  it('numbers rows again after rows are inserted or deleted above the formulas', () => {
    const sheet = openBook();

    sheet.type('A5', '=ROW()');
    sheet.type('B5', '=ROW()-1');

    expect([sheet.settled('A5'), sheet.settled('B5')]).toEqual(['5', '4']);

    sheet.insert('1');

    expect([sheet.settled('A6'), sheet.settled('B6')]).toEqual(['6', '5']);

    sheet.remove('1', 2);

    expect([sheet.settled('A4'), sheet.settled('B4')]).toEqual(['4', '3']);
  });

  it('gives the new column of a formula and of a reference after columns move', () => {
    const sheet = openBook();

    sheet.type('C1', '=COLUMN()');
    sheet.type('A1', '=COLUMN(Sheet1!C1)', 'Rates');

    expect([sheet.settled('C1'), sheet.settled('A1', 'Rates')]).toEqual(['3', '3']);

    sheet.insert('A');

    expect([sheet.settled('D1'), sheet.settled('A1', 'Rates')]).toEqual(['4', '4']);

    sheet.remove('A', 2);

    expect([sheet.settled('B1'), sheet.settled('A1', 'Rates')]).toEqual(['2', '2']);
  });

  it('reads the row of a reference that moved with an insert above it', () => {
    const sheet = openBook();

    sheet.type('A1', '=ROW(Sheet1!A5)', 'Rates');
    sheet.type('A2', '=ROWS(Sheet1!A:A)-ROW(Sheet1!A6)', 'Rates');

    expect([sheet.settled('A1', 'Rates'), sheet.settled('A2', 'Rates')]).toEqual(['5', '1048570']);

    sheet.insert('3');

    expect([sheet.settled('A1', 'Rates'), sheet.settled('A2', 'Rates')]).toEqual(['6', '1048569']);
  });

  it('intersects a whole column at the row a formula moved to', () => {
    const sheet = openBook();

    sheet.type('A6', '4', 'Rates');
    sheet.type('A7', '9', 'Rates');
    sheet.type('C6', '=@Rates!A:A');

    expect(sheet.settled('C6')).toBe('4');

    sheet.insert('1');

    expect(sheet.settled('C7')).toBe('9');
  });

  it('reads a relative R1C1 address of INDIRECT from the row a formula moved to', () => {
    const sheet = openBook();

    sheet.type('A3', '7', 'Rates');
    sheet.type('A4', '8', 'Rates');
    sheet.type('B4', '=INDIRECT("Rates!R[-1]C[-1]",FALSE)');

    expect(sheet.settled('B4')).toBe('7');

    sheet.insert('1');

    expect(sheet.settled('B5')).toBe('8');
  });

  it('computes a formula again when the cell it read was in a deleted row and it moved onto that place', () => {
    const sheet = openBook();

    sheet.type('A5', '1');
    sheet.type('A7', '=INDIRECT("R[-1]C",FALSE)');

    expect(sheet.settled('A7')).toBe('0');

    sheet.remove('6');

    expect([sheet.settled('A6'), sheet.calculator.formulaAt(sheet.first, 5, 0)?.state]).toEqual([
      '1',
      'fresh',
    ]);
  });

  it('reads a relative name and a name over ROW() from the row a formula moved to', () => {
    const sheet = openBook();

    sheet.type('A4', '40', 'Rates');
    sheet.type('A5', '50', 'Rates');
    sheet.name('Prev', '=Rates!A4', 'Sheet1', undefined, 'B5');
    sheet.name('Here', '=ROW()');
    sheet.type('B5', '=Prev');
    sheet.type('C5', '=Here');

    expect([sheet.settled('B5'), sheet.settled('C5')]).toEqual(['40', '5']);

    sheet.insert('1');

    expect([sheet.settled('B6'), sheet.settled('C6')]).toEqual(['50', '6']);

    sheet.type('A5', '55', 'Rates');

    expect(sheet.settled('B6')).toBe('55');
  });

  it('reads the row of a table on another sheet that a formula moved to', () => {
    const sheet = openBook();

    sheet.type('A1', 'Item', 'Rates');
    sheet.type('B1', 'Amount', 'Rates');

    ['2', '3', '4', '5', '6'].forEach((row) => {
      sheet.type(`A${row}`, `Item ${row}`, 'Rates');
      sheet.type(`B${row}`, `${row}0`, 'Rates');
    });

    sheet.table('A1:B6', { name: 'Sales' }, 'Rates');
    sheet.type('D3', '=Sales[@Amount]');

    expect(sheet.settled('D3')).toBe('30');

    sheet.insert('1');

    expect(sheet.settled('D4')).toBe('40');

    sheet.type('B4', '44', 'Rates');

    expect(sheet.settled('D4')).toBe('44');
  });

  it(
    'leaves formulas over single cells waiting for nothing after a row is inserted among them',
    { timeout: MANY_ROWS_TIMEOUT_MS },
    async () => {
      const sheet = openBook();

      const entries = Array.from({ length: MANY_ROWS }, (_, row): LoadEntry => ({
        row,
        col: 2,
        formula: `=A${String(row + 1)}+B${String(row + 1)}`,
      }));

      await loadCells(sheet.calculator, sheet.first, entries, {
        budgetMs: Number.POSITIVE_INFINITY,
      }).settled;

      sheet.calculator.recalculate({ budgetMs: Number.POSITIVE_INFINITY });

      sheet.insert(String(MANY_ROWS / 2));

      expect(sheet.calculator.pending).toBe(0);
    },
  );
});
