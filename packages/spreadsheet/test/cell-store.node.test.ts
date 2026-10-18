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
});
