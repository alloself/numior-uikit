import { describe, expect, it } from 'vite-plus/test';
import { numberValue } from '../src/core';
import { openSheet } from './sheet-harness';

const numbers = () => {
  const sheet = openSheet();

  sheet.enter('A1', 1);
  sheet.enter('A2', 2);
  sheet.enter('A3', 3);
  return sheet;
};

describe('dynamic arrays', () => {
  it('spills an array over the cells below and to the right of its formula', () => {
    const sheet = openSheet();

    sheet.enter('B1', '=SEQUENCE(3, 2)');
    sheet.enter('E1', '=SUM(B1#)');
    sheet.enter('F1', '=B1#*10');
    sheet.recalc();

    expect(sheet.grid('B1:C3')).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
    ]);

    expect(sheet.spill('B1')).toBe('B1:C3');
    expect(sheet.value('E1')).toEqual(numberValue(21));

    expect(sheet.grid('F1:G3')).toEqual([
      [10, 20],
      [30, 40],
      [50, 60],
    ]);
  });

  it('applies operators item by item and stretches single rows and columns', () => {
    const sheet = numbers();

    sheet.enter('B1', '=A1:A3*2');
    sheet.enter('C1', '=A1:A3+{10,20}');
    sheet.enter('E1', '={1;2}+{1;2;3}');
    sheet.enter('F1', '=-A1:A3');
    sheet.enter('G1', '=A1:A3>1');
    sheet.recalc();

    expect(sheet.grid('B1:B3')).toEqual([[2], [4], [6]]);

    expect(sheet.grid('C1:D3')).toEqual([
      [11, 21],
      [12, 22],
      [13, 23],
    ]);

    expect(sheet.grid('E1:E3')).toEqual([[2], [4], ['#N/A']]);
    expect(sheet.grid('F1:F3')).toEqual([[-1], [-2], [-3]]);
    expect(sheet.grid('G1:G3')).toEqual([[false], [true], [true]]);
  });

  it('lifts scalar functions over arrays and keeps errors inside their items', () => {
    const sheet = numbers();

    sheet.enter('B1', '=ABS({-1,2})');
    sheet.enter('B2', '=ROUND({1.25,2.5}, 1)');
    sheet.enter('B3', '=IFERROR(1/{0,2}, "none")');
    sheet.enter('B4', '=NOT({TRUE,FALSE})');
    sheet.enter('B5', '=1/{0,4}');
    sheet.enter('D1', '=IF(A1:A3>1, "big", "small")');
    sheet.enter('E1', '=VLOOKUP({2;3}, A1:A3*{1,10}, 2, FALSE)');
    sheet.recalc();

    expect(sheet.grid('B1:C5')).toEqual([
      [1, 2],
      [1.3, 2.5],
      ['none', 0.5],
      [false, true],
      ['#DIV/0!', 0.25],
    ]);

    expect(sheet.grid('D1:D3')).toEqual([['small'], ['big'], ['big']]);
    expect(sheet.grid('E1:E2')).toEqual([[20], [30]]);
  });

  it('spills ranges, transposes arrays and refuses empty or missing spills', () => {
    const sheet = numbers();

    sheet.enter('B1', '=A1:A3');
    sheet.enter('C1', '=TRANSPOSE(A1:A3)');
    sheet.enter('C3', '=SEQUENCE(0)');
    sheet.enter('C4', '=A1#');
    sheet.enter('A1048575', '=SEQUENCE(3)');
    sheet.recalc();

    expect(sheet.grid('B1:B3')).toEqual([[1], [2], [3]]);
    expect(sheet.grid('C1:E1')).toEqual([[1, 2, 3]]);
    expect(sheet.value('C3')).toEqual({ kind: 'error', code: '#CALC!' });
    expect(sheet.value('C4')).toEqual({ kind: 'error', code: '#REF!' });
    expect(sheet.value('A1048575')).toEqual({ kind: 'error', code: '#SPILL!' });
  });

  it('answers #SPILL! while a value blocks the area and spills again once it is cleared', () => {
    const sheet = openSheet();

    sheet.enter('B1', '=SEQUENCE(3)');
    sheet.enter('D1', '=B2+1');
    sheet.recalc();
    sheet.enter('B3', 'mine');
    sheet.recalc();

    expect(sheet.grid('B1:B3')).toEqual([['#SPILL!'], [null], ['mine']]);
    expect(sheet.spill('B1')).toBeUndefined();
    expect(sheet.value('D1')).toEqual(numberValue(1));

    sheet.clear('B3');
    sheet.recalc();

    expect(sheet.grid('B1:B3')).toEqual([[1], [2], [3]]);
    expect(sheet.value('D1')).toEqual(numberValue(3));
  });

  it('lets a formula typed into a spill area block it', () => {
    const sheet = openSheet();

    sheet.enter('A5', '=SEQUENCE(1, 3)');
    sheet.recalc();
    sheet.enter('B5', '=7');
    sheet.recalc();

    expect(sheet.grid('A5:C5')).toEqual([['#SPILL!', 7, null]]);
  });

  it('frees cells when a spill shrinks and updates what reads them', () => {
    const sheet = openSheet();

    sheet.enter('A1', 3);
    sheet.enter('B1', '=SEQUENCE(A1)');
    sheet.enter('D1', '=COUNT(B1:B5)');
    sheet.recalc();
    sheet.enter('A1', 2);
    sheet.recalc();

    expect(sheet.grid('B1:B3')).toEqual([[1], [2], [null]]);
    expect(sheet.value('D1')).toEqual(numberValue(2));
  });

  it('computes readers of spilled cells after their anchor in the same recalculation', () => {
    const sheet = openSheet();

    sheet.enter('D1', '=B2*10');
    sheet.enter('B1', '=SEQUENCE(3)');
    const run = sheet.recalc();

    expect(sheet.value('D1')).toEqual(numberValue(20));
    expect(run.done).toBe(run.total);
    expect(sheet.calculator.pending).toBe(0);
  });

  it('treats a spill that reads its own area as a circular reference', () => {
    const sheet = openSheet();

    sheet.enter('B1', '=SEQUENCE(3)+B3');
    sheet.recalc();

    expect(sheet.state('B1')).toBe('cycle');
    expect(sheet.grid('B1:B3')).toEqual([[0], [null], [null]]);
  });

  it.each([
    ['a cell', 'C1', '=A1:A3', 'A2', '=C3+1'],
    ['a range', 'C1', '=A1:A3', 'A2', '=SUM(C2:C3)'],
    ['a range beside a wide spill', 'B5', '=SEQUENCE(1, 1100)*A4', 'A4', '=SUM(C5:D5)'],
  ])(
    'treats a spill that comes back to its formula through %s as a circular reference',
    (_case, anchor, spilled, reader, reading) => {
      const sheet = numbers();

      sheet.enter(anchor, spilled);
      sheet.enter(reader, reading);
      sheet.recalc();

      expect(sheet.state(anchor)).toBe('cycle');
      expect(sheet.state(reader)).toBe('cycle');
      expect(sheet.value(anchor)).toEqual(numberValue(0));
      expect(sheet.value(reader)).toEqual(numberValue(0));
      expect(sheet.spill(anchor)).toBeUndefined();
    },
  );

  it('finds a circular reference through a spill among formulas that read single cells', () => {
    const sheet = numbers();

    sheet.enter('E1', '=A1');
    sheet.enter('E2', '=A3');
    sheet.enter('E3', '=B9');
    sheet.enter('C1', '=A1:A3');
    sheet.enter('A2', '=C3+1');
    sheet.recalc();

    expect(sheet.state('C1')).toBe('cycle');

    expect(sheet.grid('A2:E3')).toEqual([
      [0, null, null, null, 3],
      [3, null, null, null, 0],
    ]);
  });

  it('computes the spill again once the formula that closed the circle is gone', () => {
    const sheet = numbers();

    sheet.enter('C1', '=A1:A3');
    sheet.enter('A2', '=C3+1');
    sheet.recalc();
    sheet.enter('A2', 2);
    sheet.recalc();

    expect(sheet.state('C1')).toBe('fresh');
    expect(sheet.spill('C1')).toBe('C1:C3');
    expect(sheet.grid('C1:C3')).toEqual([[1], [2], [3]]);
  });

  it('keeps a spill read by a formula outside its sources out of the circular references', () => {
    const sheet = numbers();

    sheet.enter('C1', '=A1:A3*2');
    sheet.enter('D1', '=SUM(C2:C3)');
    sheet.recalc();

    expect(sheet.state('C1')).toBe('fresh');
    expect(sheet.value('D1')).toEqual(numberValue(10));
  });
});

describe('volatile functions', () => {
  it('reads the clock and the random source once per recalculation', () => {
    let roll = 0.25;

    const sheet = openSheet({
      clock: () => new Date(2026, 9, 18, 12),
      random: () => roll,
    });

    sheet.enter('A1', '=NOW()');
    sheet.enter('A2', '=TODAY()');
    sheet.enter('A3', '=RAND()');
    sheet.enter('A4', '=RANDBETWEEN(1, 4)');
    sheet.enter('A5', '=A3*2');
    sheet.enter('B1', '=RANDARRAY(2, 2, 0, 10, TRUE)');
    sheet.enter('B4', '=RANDBETWEEN(5, 1)');
    sheet.recalc();

    expect(sheet.grid('A1:A5')).toEqual([[46_313.5], [46_313], [0.25], [2], [0.5]]);

    expect(sheet.grid('B1:C2')).toEqual([
      [2, 2],
      [2, 2],
    ]);

    expect(sheet.value('B4')).toEqual({ kind: 'error', code: '#NUM!' });

    roll = 0.75;
    sheet.enter('Z9', 1);
    sheet.recalc({ budgetMs: Number.POSITIVE_INFINITY, volatile: false });

    expect(sheet.value('A3')).toEqual(numberValue(0.25));

    sheet.recalc();

    expect(sheet.grid('A3:A5')).toEqual([[0.75], [4], [1.5]]);
  });
});
