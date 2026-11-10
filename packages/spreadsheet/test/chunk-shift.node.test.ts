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
  type CellValue,
} from '../src/core';
import { createCellFormats } from '../src/core/cell-formats';
import { shiftIndex, type LineMove } from '../src/core/lines';

interface Placed<T> {
  readonly row: number;
  readonly col: number;
  readonly item: T;
}

const FILLED_ROWS = 20_000;

const FILLED_COLS = 50;

const ROW_BUDGET_MS = 40;

const BUDGET_MS = 100;

const WHOLE = { top: 0, left: 0, bottom: MAX_ROWS - 1, right: MAX_COLS - 1 };

const ROWS = [0, 1, 2, 509, 510, 511, 512, 513, 1023, 1024, 1500, MAX_ROWS - 2, MAX_ROWS - 1];

const COLS = [0, 1, 30, 31, 32, 33, 63, 64, 100, MAX_COLS - 2, MAX_COLS - 1];

const MOVES: readonly LineMove[] = [
  { axis: 'rows', at: 0, count: 1 },
  { axis: 'rows', at: 1, count: 2 },
  { axis: 'rows', at: 511, count: 1 },
  { axis: 'rows', at: 512, count: 512 },
  { axis: 'rows', at: 3, count: 700 },
  { axis: 'rows', at: 0, count: -1 },
  { axis: 'rows', at: 510, count: -3 },
  { axis: 'rows', at: 2, count: -600 },
  { axis: 'rows', at: 600, count: -1024 },
  { axis: 'rows', at: MAX_ROWS - 2, count: 1 },
  { axis: 'rows', at: MAX_ROWS - 2, count: -1 },
  { axis: 'cols', at: 0, count: 1 },
  { axis: 'cols', at: 31, count: 2 },
  { axis: 'cols', at: 1, count: 32 },
  { axis: 'cols', at: 2, count: 45 },
  { axis: 'cols', at: 0, count: -1 },
  { axis: 'cols', at: 30, count: -4 },
  { axis: 'cols', at: 1, count: -70 },
  { axis: 'cols', at: MAX_COLS - 2, count: 1 },
  { axis: 'cols', at: MAX_COLS - 2, count: -1 },
];

const valueAt = (index: number): CellValue => {
  switch (index % 4) {
    case 0:
      return numberValue(index + 0.5);
    case 1:
      return textValue(`text ${String(index)}`);
    case 2:
      return booleanValue(index % 8 === 2);
    default:
      return errorValue('#N/A');
  }
};

const everywhere = <T>(itemAt: (index: number) => T): Placed<T>[] =>
  ROWS.flatMap((row, rowIndex) =>
    COLS.map((col, colIndex) => ({ row, col, item: itemAt(rowIndex * COLS.length + colIndex) })),
  );

const moved = <T>(placed: readonly Placed<T>[], move: LineMove): Placed<T>[] =>
  placed.reduce<Placed<T>[]>((kept, cell) => {
    const line = shiftIndex(move.axis === 'rows' ? cell.row : cell.col, move);

    if (line !== undefined) {
      kept.push(move.axis === 'rows' ? { ...cell, row: line } : { ...cell, col: line });
    }
    return kept;
  }, []);

const sorted = <T>(placed: readonly Placed<T>[]): Placed<T>[] =>
  placed.toSorted((left, right) => left.row - right.row || left.col - right.col);

describe('line shift of chunked stores', () => {
  it.each(MOVES)('moves the values of every kind by $count $axis at $at and back again', (move) => {
    const cells = createCellStore(createSharedStrings());
    const placed = everywhere(valueAt);
    const seen: Placed<CellValue>[] = [];

    placed.forEach(({ row, col, item }) => {
      cells.set(row, col, item);
    });

    cells.shiftLines(move.axis, move.at, move.count);

    cells.forEachInRange(WHOLE, (row, col, item) => {
      seen.push({ row, col, item });
    });

    const expected = moved(placed, move);

    expect(sorted(seen)).toEqual(sorted(expected));
    expect(cells.size).toBe(expected.length);

    cells.shiftLines(move.axis, move.at, -move.count);

    expect(cells.size).toBe(moved(expected, { ...move, count: -move.count }).length);
  });

  it.each(MOVES)('moves the formats by $count $axis at $at', (move) => {
    const formats = createCellFormats();
    const placed = everywhere((index) => index + 1);
    const seen: Placed<number>[] = [];

    placed.forEach(({ row, col, item }) => {
      formats.set(row, col, item);
    });

    formats.shiftLines(move.axis, move.at, move.count);

    formats.forEachInRange(WHOLE, (row, col, item) => {
      seen.push({ row, col, item });
    });

    const expected = moved(placed, move);

    expect(sorted(seen)).toEqual(sorted(expected));
    expect(formats.size).toBe(expected.length);
  });

  it('inserts a row and a column above a million values within the budget', () => {
    const cells = createCellStore(createSharedStrings());

    for (let row = 0; row < FILLED_ROWS; row += 1) {
      for (let col = 0; col < FILLED_COLS; col += 1) {
        cells.set(row, col, numberValue(row + col));
      }
    }

    const started = performance.now();

    cells.shiftLines('rows', 0, 1);

    const rowSpent = performance.now() - started;

    cells.shiftLines('cols', 0, 1);

    const spent = performance.now() - started;

    expect(cells.get(1, 1)).toEqual(numberValue(0));
    expect(cells.get(FILLED_ROWS, FILLED_COLS)).toEqual(numberValue(FILLED_ROWS + FILLED_COLS - 2));
    expect(cells.size).toBe(FILLED_ROWS * FILLED_COLS);
    expect(rowSpent).toBeLessThan(ROW_BUDGET_MS);
    expect(spent).toBeLessThan(BUDGET_MS);
  });

  it('forgets the chunks a shift has emptied and marks the touched ones as changed', () => {
    const cells = createCellStore(createSharedStrings());
    const stamps: number[] = [];

    cells.set(5, 0, numberValue(1));
    cells.set(600, 0, numberValue(2));
    cells.shiftLines('rows', 0, -10);

    cells.forEachChunk(WHOLE, (stamp) => {
      stamps.push(stamp);
    });

    expect(cells.chunks).toBe(1);
    expect(cells.get(590, 0)).toEqual(numberValue(2));
    expect(stamps).toEqual([cells.revision]);
  });
});
