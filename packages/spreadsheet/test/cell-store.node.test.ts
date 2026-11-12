import { describe, expect, it } from 'vite-plus/test';
import {
  MAX_COLS,
  MAX_ROWS,
  booleanValue,
  createCellStore,
  createSharedStrings,
  errorValue,
  numberValue,
  textValue,
  type CellStore,
} from '../src/core';

const store = (): CellStore => createCellStore(createSharedStrings());

const SCATTERED: readonly (readonly [number, number])[] = [
  [511, 31],
  [512, 32],
  [1023, 63],
  [1024, 5],
  [40, 700],
  [3000, 64],
  [7, 95],
];

const FILLED_ROWS = 20_000;

const FILLED_COLS = 50;

const USED_RANGE_CALLS = 50;

const USED_RANGE_BUDGET_MS = 100;

const WHOLE_SHEET = { top: 0, left: 0, bottom: MAX_ROWS - 1, right: MAX_COLS - 1 };

const WHOLE_WALKS = 50;

const WHOLE_WALKS_BUDGET_MS = 100;

const boundsOf = (points: readonly (readonly [number, number])[]): number[] =>
  points.reduce(
    ([top = 0, left = 0, bottom = 0, right = 0], [row, col]) => [
      Math.min(top, row),
      Math.min(left, col),
      Math.max(bottom, row),
      Math.max(right, col),
    ],
    [MAX_ROWS, MAX_COLS, -1, -1],
  );

const usedOf = (cells: CellStore): number[] => {
  const used = cells.usedRange();

  return used === undefined ? [] : [used.top, used.left, used.bottom, used.right];
};

describe('cell store', () => {
  it('keeps every kind of value and forgets cleared cells and empty chunks', () => {
    const cells = store();

    cells.set(0, 0, numberValue(1.5));
    cells.set(0, 1, textValue('a'));
    cells.set(MAX_ROWS - 1, MAX_COLS - 1, booleanValue(true));
    cells.set(700, 40, errorValue('#DIV/0!'));

    expect(cells.get(0, 0)).toEqual({ kind: 'number', value: 1.5 });
    expect(cells.get(0, 1)).toEqual({ kind: 'string', value: 'a' });
    expect(cells.get(MAX_ROWS - 1, MAX_COLS - 1)).toEqual({ kind: 'boolean', value: true });
    expect(cells.get(700, 40)).toEqual({ kind: 'error', code: '#DIV/0!' });
    expect(cells.get(5, 5)).toEqual({ kind: 'empty' });
    expect([cells.size, cells.chunks]).toEqual([4, 3]);

    cells.set(700, 40, { kind: 'empty' });
    cells.set(0, 1, { kind: 'empty' });

    expect([cells.size, cells.chunks]).toEqual([2, 2]);
    expect(numberValue(Number.POSITIVE_INFINITY)).toEqual({ kind: 'error', code: '#NUM!' });
  });

  it('visits only filled cells of a range and finds the used range', () => {
    const cells = store();

    cells.set(3, 2, numberValue(1));
    cells.set(1000, 2, numberValue(2));
    cells.set(1000, 100, numberValue(3));

    const seen: string[] = [];

    cells.forEachInRange({ top: 0, left: 0, bottom: MAX_ROWS - 1, right: 50 }, (row, col) => {
      seen.push(`${String(row)}:${String(col)}`);
    });

    expect(seen.toSorted()).toEqual(['1000:2', '3:2']);
    expect(cells.usedRange()).toEqual({ top: 3, left: 2, bottom: 1000, right: 100 });
    expect(store().usedRange()).toBeUndefined();
  });

  it('finds the used range of cells scattered over chunk borders as they come and go', () => {
    const cells = store();

    const seen = SCATTERED.map((point, index) => {
      cells.set(point[0], point[1], numberValue(index));

      return usedOf(cells);
    });

    const left = SCATTERED.map((point) => {
      cells.set(point[0], point[1], { kind: 'empty' });

      return usedOf(cells);
    });

    expect(seen).toEqual(SCATTERED.map((_point, index) => boundsOf(SCATTERED.slice(0, index + 1))));

    expect(left).toEqual(
      SCATTERED.map((_point, index) =>
        index + 1 < SCATTERED.length ? boundsOf(SCATTERED.slice(index + 1)) : [],
      ),
    );
  });

  it('finds the used range of a million values within the budget', { tags: ['budget'] }, () => {
    const cells = store();

    for (let row = 0; row < FILLED_ROWS; row += 1) {
      for (let col = 0; col < FILLED_COLS; col += 1) {
        cells.set(row, col, numberValue(row + col));
      }
    }

    const started = performance.now();

    for (let call = 0; call < USED_RANGE_CALLS; call += 1) {
      cells.usedRange();
    }

    const spent = performance.now() - started;

    expect(usedOf(cells)).toEqual([0, 0, FILLED_ROWS - 1, FILLED_COLS - 1]);
    expect(spent).toBeLessThan(USED_RANGE_BUDGET_MS);
  });

  it('visits a range row by row even when it crosses chunks', () => {
    const cells = store();
    const seen: string[] = [];

    cells.set(0, 40, numberValue(2));
    cells.set(0, 1, numberValue(1));
    cells.set(1, 0, numberValue(3));
    cells.set(600, 33, numberValue(5));
    cells.set(600, 0, numberValue(4));

    cells.forEachInRange({ top: 0, left: 0, bottom: 700, right: 50 }, (_row, _col, value) => {
      seen.push(value.kind === 'number' ? String(value.value) : '?');
    });

    expect(seen).toEqual(['1', '2', '3', '4', '5']);
  });

  it(
    'walks a whole sheet as fast as its filled chunks allow and still row by row',
    { tags: ['budget'] },
    () => {
      const cells = store();
      const seen: string[] = [];

      SCATTERED.forEach(([row, col]) => {
        cells.set(row, col, textValue(`${String(row)}:${String(col)}`));
      });

      const started = performance.now();

      for (let walk = 0; walk < WHOLE_WALKS; walk += 1) {
        seen.length = 0;

        cells.forEachInRange(WHOLE_SHEET, (row, col) => {
          seen.push(`${String(row)}:${String(col)}`);
        });
      }

      const spent = performance.now() - started;

      expect(seen).toEqual(['7:95', '40:700', '511:31', '512:32', '1023:63', '1024:5', '3000:64']);
      expect(spent).toBeLessThan(WHOLE_WALKS_BUDGET_MS);
    },
  );

  it('jumps like Ctrl with the arrows to the edges of filled runs and of the sheet', () => {
    const cells = store();

    for (const row of [2, 3, 4, 9000]) {
      cells.set(row, 0, numberValue(row));
    }

    expect(cells.nextEdge(0, 0, 1, 0)).toBe(2);
    expect(cells.nextEdge(2, 0, 1, 0)).toBe(4);
    expect(cells.nextEdge(4, 0, 1, 0)).toBe(9000);
    expect(cells.nextEdge(9000, 0, 1, 0)).toBe(MAX_ROWS - 1);
    expect(cells.nextEdge(9000, 0, -1, 0)).toBe(4);
    expect(cells.nextEdge(0, 5, 0, 1)).toBe(MAX_COLS - 1);
    expect(cells.nextEdge(0, 5, 0, -1)).toBe(0);
  });

  it('moves whole lines of every value kind across chunks and drops deleted lines', () => {
    const cells = store();

    cells.set(0, 0, numberValue(1));
    cells.set(511, 1, textValue('edge'));
    cells.set(600, 2, booleanValue(false));
    cells.set(MAX_ROWS - 1, 3, errorValue('#N/A'));
    cells.shiftLines('rows', 1, 2);

    expect(cells.get(0, 0)).toEqual(numberValue(1));
    expect(cells.get(513, 1)).toEqual(textValue('edge'));
    expect(cells.get(602, 2)).toEqual(booleanValue(false));
    expect(cells.get(511, 1)).toEqual({ kind: 'empty' });
    expect(cells.size).toBe(3);

    cells.shiftLines('rows', 500, -20);

    expect(cells.get(513, 1)).toEqual({ kind: 'empty' });
    expect(cells.get(582, 2)).toEqual(booleanValue(false));
    expect(cells.size).toBe(2);

    cells.shiftLines('cols', 1, 30);

    expect(cells.get(582, 32)).toEqual(booleanValue(false));
    expect(cells.get(0, 0)).toEqual(numberValue(1));
  });
});
