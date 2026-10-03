import { describe, expect, it } from 'vitest';
import { cellEdge, columnName, tableCells, type NuiTableSourceCell } from '../src';

const COLUMN: ReadonlySet<number> = new Set([2, 3, 4, 7]);

const inColumn = (row: number, col: number): NuiTableSourceCell | undefined =>
  col === 0 && COLUMN.has(row) ? { text: String(row) } : undefined;

const COLUMN_SIZE = { rows: 10, cols: 1 };

const downFrom = (row: number): number =>
  cellEdge(inColumn, COLUMN_SIZE, { row, col: 0 }, 'down').row;

const upFrom = (row: number): number => cellEdge(inColumn, COLUMN_SIZE, { row, col: 0 }, 'up').row;

describe('tableCells', () => {
  it('names columns as spreadsheets do', () => {
    expect([0, 1, 25, 26, 27, 51, 52, 701, 702, 16_383].map(columnName)).toEqual([
      'A',
      'B',
      'Z',
      'AA',
      'AB',
      'AZ',
      'BA',
      'ZZ',
      'AAA',
      'XFD',
    ]);
  });

  it('finds the edge of the data the way Ctrl and an arrow do in a spreadsheet', () => {
    expect([0, 2, 3, 4, 7, 9].map(downFrom)).toEqual([2, 4, 4, 7, 9, 9]);
    expect([9, 7, 5, 3, 2, 0].map(upFrom)).toEqual([7, 4, 4, 2, 0, 0]);

    expect(cellEdge(inColumn, COLUMN_SIZE, { row: 3, col: 0 }, 'next')).toEqual({ row: 3, col: 0 });
  });

  it('turns a cell source into rows, lettered columns, styles, row labels and edges', async () => {
    const reads: string[] = [];

    const cells = tableCells({
      rows: 1000,
      cols: 30,
      cellAt: (row, col) => {
        reads.push(`${row}:${col}`);
        return row % 2 === 0
          ? { text: `${columnName(col)}${row + 1}`, style: { fill: 'gold' } }
          : undefined;
      },
      columnWidth: (col) => (col === 0 ? 140 : undefined),
    });

    const second = cells.columns[1];

    expect(cells.rows).toHaveLength(1000);
    expect(cells.rows[999]).toBe(999);
    expect(cells.getKey(42)).toBe(42);
    expect(cells.columns.map((column) => column.key).slice(-3)).toEqual(['AB', 'AC', 'AD']);
    expect(cells.columns.map((column) => column.width).slice(0, 2)).toEqual([140, 96]);
    expect(second?.value(4)).toBe('B5');
    expect(second?.value(5)).toBe('');

    expect(
      second === undefined
        ? undefined
        : cells.cellStyle({ row: 4, column: second, position: 4, pinned: false }),
    ).toEqual({ fill: 'gold' });

    expect(reads).toEqual(['4:1', '5:1']);
    await Promise.resolve();
    expect(second?.value(4)).toBe('B5');
    expect(reads).toEqual(['4:1', '5:1', '4:1']);
    expect(cells.rowHeaders.label?.(9, 0)).toBe('10');
    expect(cells.nextEdge({ row: 1, col: 3 }, 'down')).toEqual({ row: 2, col: 3 });
    expect(cells.nextEdge({ row: 0, col: 3 }, 'next')).toEqual({ row: 0, col: 29 });
  });

  it('leaves the edges to the source when it knows them', () => {
    const cells = tableCells({
      rows: 1_048_576,
      cols: 16_384,
      cellAt: () => undefined,
      nextEdge: (from, direction) =>
        direction === 'down' ? { row: 1_048_575, col: from.col } : from,
    });

    expect(cells.nextEdge({ row: 0, col: 5 }, 'down')).toEqual({ row: 1_048_575, col: 5 });
    expect(cells.columns.at(-1)?.key).toBe('XFD');
  });
});
