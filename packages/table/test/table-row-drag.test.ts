import { afterEach, describe, expect, it } from 'vitest';
import { TableDriver, type TableMountOptions } from './drivers/table';
import { FILE_COLUMNS, FILES, type FileNode } from './support/files';
import { people, PEOPLE_COLUMNS, type Person } from './support/people';

const mounted: Array<TableDriver<Person> | TableDriver<FileNode>> = [];

const mountPeople = (options: Partial<TableMountOptions<Person>> = {}): TableDriver<Person> => {
  const grid = TableDriver.mount<Person>({
    columns: PEOPLE_COLUMNS,
    rows: people(50),
    config: { locale: 'ru-RU' },
    ...options,
    props: { rowDrag: true, ...options.props },
  });

  mounted.push(grid);
  return grid;
};

const mountFiles = (): TableDriver<FileNode> => {
  const grid = TableDriver.mount<FileNode>({
    columns: FILE_COLUMNS,
    rows: FILES,
    expanded: ['docs'],
    config: { locale: 'ru-RU' },
    props: {
      rowDrag: true,
      getKey: (row: FileNode) => row.path,
      getChildren: (row: FileNode) => row.items,
      hasChildren: (row: FileNode) => row.lazy === true,
    },
  });

  mounted.push(grid);
  return grid;
};

afterEach(() => {
  for (const grid of mounted.splice(0)) {
    grid.unmount();
  }
});

describe('NuiTable row drag', () => {
  it('drags a row by its grip below another one and emits the sibling indices', async () => {
    const grid = mountPeople();
    await grid.settle();

    expect(grid.colCount).toBe(19);
    expect(grid.gripDisabled(1)).toBe(false);
    await grid.grabRow(1);
    expect(grid.rowDragging(1)).toBe(true);
    expect(grid.ghostText).toBe('Сотрудник 1');
    expect(grid.ghostSize).toBe('40px');
    await grid.moveRowTo(4, 'after');
    expect(grid.dropLine).toBe('240px');
    await grid.dropRow();

    expect(grid.reorders).toEqual([{ row: people(50)[1], from: 1, to: 4, parent: undefined }]);
    expect(grid.announcement).toBe('Строка «Сотрудник 1» перемещена на место 5 из 50');
    expect(grid.rowDragging(1)).toBe(false);
    expect(grid.dropLine).toBeUndefined();
    expect(grid.cellText(1, 2)).toBe('Сотрудник 1');
  });

  it('moves a row from its grip cell with the keyboard and cancels with Escape', async () => {
    const grid = mountPeople();
    await grid.focusCell(1, 0);
    await grid.press(' ');
    expect(grid.announcement).toBe('Строка «Сотрудник 1» взята, место 2 из 50');
    await grid.press('ArrowDown');
    expect(grid.announcement).toBe('Строка «Сотрудник 1» на месте 3 из 50');
    expect(grid.dropLine).toBe('160px');
    await grid.press('ArrowDown');
    await grid.press(' ');
    expect(grid.reorders).toEqual([{ row: people(50)[1], from: 1, to: 3, parent: undefined }]);
    expect(grid.announcement).toBe('Строка «Сотрудник 1» перемещена на место 4 из 50');
    expect(grid.focusedCell).toEqual({ row: 3, col: 0 });
    await grid.press(' ');
    await grid.press('ArrowUp');
    await grid.press('Escape');
    expect(grid.announcement).toBe('Перемещение строки «Сотрудник 3» отменено');
    expect(grid.reorders).toHaveLength(1);
    expect(grid.dropLine).toBeUndefined();
  });

  it('disables the grips while the rows are sorted', async () => {
    const grid = mountPeople({ sort: [{ key: 'name', direction: 'asc' }] });
    await grid.settle();

    expect(grid.gripDisabled(0)).toBe(true);
    await grid.grabRow(0);
    expect(grid.rowDragging(0)).toBe(false);
    await grid.moveRowTo(3, 'after');
    await grid.dropRow();
    expect(grid.reorders).toEqual([]);
    await grid.focusCell(0, 0);
    await grid.press(' ');
    expect(grid.reorders).toEqual([]);
  });

  it('keeps tree rows among their siblings', async () => {
    const grid = mountFiles();
    await grid.settle();

    expect(grid.cellText(2, 1)).toBe('adr.md');
    await grid.grabRow(2);
    await grid.moveRowTo(1, 'before');
    await grid.dropRow();

    expect(grid.reorders).toEqual([
      { row: FILES[0]?.items?.[1], from: 1, to: 0, parent: FILES[0] },
    ]);

    await grid.grabRow(1);
    await grid.moveRowTo(5, 'after');
    await grid.dropRow();
    expect(grid.reorders).toHaveLength(1);

    await grid.grabRow(2);
    await grid.moveRowTo(3, 'after');
    await grid.dropRow();

    expect(grid.reorders[1]).toEqual({
      row: FILES[0]?.items?.[1],
      from: 1,
      to: 2,
      parent: FILES[0],
    });
  });
});
