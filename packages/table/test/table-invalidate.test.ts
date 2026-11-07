import { afterEach, describe, expect, it } from 'vite-plus/test';
import { tableCells, type NuiTableCellSource } from '../src';
import { TableDriver } from './drivers/table';

interface CountedSheet {
  readonly source: NuiTableCellSource;
  readonly reads: Set<number>;
  readonly labels: Set<number>;
  readonly texts: Map<string, string>;
}

const mounted: TableDriver<number>[] = [];

const countedSheet = (): CountedSheet => {
  const reads = new Set<number>();
  const labels = new Set<number>();
  const texts = new Map<string, string>();

  return {
    reads,
    labels,
    texts,
    source: {
      rows: 200,
      cols: 6,
      cellAt: (row, col) => {
        reads.add(row);
        return { text: texts.get(`${row}:${col}`) ?? `${row}:${col}` };
      },
      rowLabel: (row) => {
        labels.add(row);
        return String(row + 1);
      },
    },
  };
};

const mountSheet = (sheet: CountedSheet): TableDriver<number> => {
  const cells = tableCells(sheet.source);

  const grid = TableDriver.mount<number>({
    columns: cells.columns,
    rows: cells.rows,
    config: { locale: 'ru-RU' },
    width: 900,
    props: { getKey: cells.getKey, rowHeaders: cells.rowHeaders, nextEdge: cells.nextEdge },
  });

  mounted.push(grid);
  return grid;
};

afterEach(() => {
  for (const grid of mounted.splice(0)) {
    grid.unmount();
  }
});

describe('NuiTable invalidate', () => {
  it('reads again only the rows of the changed ranges and everything without ranges', async () => {
    const sheet = countedSheet();
    const grid = mountSheet(sheet);
    await grid.settle();

    sheet.reads.clear();
    sheet.texts.set('3:2', 'новое');
    await grid.invalidate([{ from: { row: 3, col: 2 }, to: { row: 4, col: 2 } }]);

    expect([...sheet.reads].toSorted((a, b) => a - b)).toEqual([3, 4]);
    expect(grid.cellText(3, 3)).toBe('новое');

    sheet.reads.clear();
    await grid.invalidate();
    expect(sheet.reads.size).toBeGreaterThan(2);
  });

  it('shows changed texts on the first invalidate without ranges', async () => {
    const sheet = countedSheet();
    const grid = mountSheet(sheet);
    await grid.settle();

    sheet.texts.set('5:1', 'пересчитано');
    await grid.invalidate();

    expect(grid.cellText(5, 2)).toBe('пересчитано');
  });

  it('re-renders only the rows the active cell leaves and enters and reads no cells again', async () => {
    const sheet = countedSheet();
    const grid = mountSheet(sheet);
    await grid.settle();
    await grid.focusCell(3, 2);

    sheet.reads.clear();
    sheet.labels.clear();
    await grid.press('ArrowDown');

    expect([...sheet.labels].toSorted((a, b) => a - b)).toEqual([3, 4]);
    expect([...sheet.reads]).toEqual([]);

    sheet.labels.clear();
    await grid.press('ArrowRight');

    expect([...sheet.labels]).toEqual([4]);
    expect([...sheet.reads]).toEqual([]);
  });
});
