import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
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

const moved = <V>(list: readonly V[], from: number, to: number): V[] => {
  const next = [...list];
  const [item] = next.splice(from, 1);

  if (item !== undefined) {
    next.splice(to, 0, item);
  }
  return next;
};

const docs = FILES[0];
const plan = docs?.items?.[0];
const adr = docs?.items?.[1];
const old = docs?.items?.[2];
const readme = FILES[2];

afterEach(() => {
  vi.useRealTimers();

  for (const grid of mounted.splice(0)) {
    grid.unmount();
  }
});

describe('NuiTable row drag', () => {
  it('puts the grip into the first data column and drags a row below another one', async () => {
    const grid = mountPeople();
    await grid.settle();

    expect(grid.colCount).toBe(18);
    expect(grid.gripColumn(1)).toBe(1);
    expect(grid.gripDisabled(1)).toBe(false);

    await grid.grabRow(1);
    expect(grid.rowDragging(1)).toBe(true);
    expect(grid.ghostText).toBe('Сотрудник 1');
    expect(grid.ghostSize).toBe('40px');
    expect(grid.ghostAcross).toBe('48px');

    await grid.moveRowTo(4, 'after');
    expect(grid.dropMark).toEqual({ kind: 'line', start: '240px', inset: '0px' });

    await grid.dropRow();

    expect(grid.reorders).toEqual([
      { row: people(50)[1], from: 1, to: 4, parent: undefined, toParent: undefined },
    ]);

    expect(grid.announcement).toBe('Строка «Сотрудник 1» перемещена на место 5 из 50');
    expect(grid.rowDragging(1)).toBe(false);
    expect(grid.dropMark).toBeUndefined();
  });

  it('leaves a row where it was when it is dropped over its own place', async () => {
    const grid = mountPeople();
    await grid.settle();

    await grid.grabRow(3);
    await grid.moveRowTo(6, 'after');

    expect(grid.dropMark).toEqual({ kind: 'line', start: '320px', inset: '0px' });

    await grid.moveRowTo(3, 'inside');

    expect(grid.dropMark).toBeUndefined();
    expect(grid.rowDragging(3)).toBe(true);

    await grid.dropRow();

    expect(grid.reorders).toEqual([]);
    expect(grid.rowDragging(3)).toBe(false);
  });

  it('shows no drop line where a drop would leave the row in its place', async () => {
    const grid = mountPeople();
    await grid.settle();

    await grid.grabRow(3);
    await grid.moveRowTo(2, 'after');

    expect(grid.dropMark).toBeUndefined();

    await grid.moveRowTo(4, 'before');

    expect(grid.dropMark).toBeUndefined();

    await grid.dropRow();

    expect(grid.reorders).toEqual([]);
  });

  it('drops a row where the pointer is when rows are pinned above the body', async () => {
    const rows = people(50);
    const grid = mountPeople({ rows, props: { pinnedRows: people(52).slice(50) } });
    await grid.settle();

    await grid.grabRow(1);

    expect(grid.rowDragging(1)).toBe(true);
    expect(grid.ghostText).toBe('Сотрудник 1');

    await grid.moveRowTo(4, 'after');

    expect(grid.dropMark).toEqual({ kind: 'line', start: '320px', inset: '0px' });

    await grid.dropRow();

    expect(grid.reorders).toEqual([
      { row: rows[1], from: 1, to: 4, parent: undefined, toParent: undefined },
    ]);
  });

  it('moves a row with Alt+Shift and the arrows and follows it after the rows update', async () => {
    const rows = people(50);
    const grid = mountPeople({ rows });
    await grid.focusCell(1, 2);
    await grid.press('ArrowUp', { alt: true, shift: true });

    expect(grid.reorders).toEqual([
      { row: rows[1], from: 1, to: 0, parent: undefined, toParent: undefined },
    ]);

    await grid.setSource(moved(rows, 1, 0));
    expect(grid.focusedCell).toEqual({ row: 0, col: 2 });
    expect(grid.announcement).toBe('Строка «Сотрудник 1» перемещена на место 1 из 50');

    await grid.press('ArrowUp', { alt: true, shift: true });
    expect(grid.reorders).toHaveLength(1);

    await grid.press('ArrowDown', { alt: true, shift: true });

    expect(grid.reorders[1]).toEqual({
      row: rows[1],
      from: 0,
      to: 1,
      parent: undefined,
      toParent: undefined,
    });
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

    await grid.focusCell(0, 1);
    await grid.press('ArrowDown', { alt: true, shift: true });
    expect(grid.reorders).toEqual([]);
  });

  it('reorders tree rows among siblings, across parents and into the first child slot', async () => {
    const grid = mountFiles();
    await grid.settle();

    expect(grid.cellText(2, 0)).toBe('adr.md');

    await grid.grabRow(2);
    await grid.moveRowTo(1, 'before');

    expect(grid.dropMark).toEqual({
      kind: 'line',
      start: '80px',
      inset: 'calc(0px + 1 * var(--_indent))',
    });

    await grid.dropRow();
    expect(grid.reorders).toEqual([{ row: adr, from: 1, to: 0, parent: docs, toParent: docs }]);

    await grid.grabRow(1);
    await grid.moveRowTo(5, 'after');
    await grid.dropRow();

    expect(grid.reorders[1]).toEqual({
      row: plan,
      from: 0,
      to: 3,
      parent: docs,
      toParent: undefined,
    });

    expect(grid.announcement).toBe('Строка «plan.md» перемещена на верхний уровень, место 4 из 4');

    await grid.grabRow(5);
    await grid.moveRowTo(0, 'after');
    await grid.dropRow();

    expect(grid.reorders[2]).toEqual({
      row: readme,
      from: 2,
      to: 0,
      parent: undefined,
      toParent: docs,
    });

    expect(grid.announcement).toBe('Строка «readme.md» перемещена в «docs», место 1 из 4');
  });

  it('nests a row after holding it over another row and never into its own subtree', async () => {
    vi.useFakeTimers();
    const grid = mountFiles();
    await grid.settle();

    await grid.grabRow(5);
    await grid.moveRowTo(3, 'inside');
    expect(grid.dropMark?.kind).toBe('line');

    await vi.advanceTimersByTimeAsync(600);
    expect(grid.dropMark).toEqual({ kind: 'box', start: '160px', size: '40px' });

    await grid.dropRow();

    expect(grid.reorders).toEqual([
      { row: readme, from: 2, to: 1, parent: undefined, toParent: old },
    ]);

    expect(grid.announcement).toBe('Строка «readme.md» перемещена в «old», место 2 из 2');

    await grid.grabRow(0);
    await grid.moveRowTo(1, 'before');
    await grid.dropRow();
    expect(grid.reorders).toHaveLength(1);

    await grid.grabRow(5);
    await grid.moveRowTo(4, 'inside');
    await vi.advanceTimersByTimeAsync(600);
    expect(grid.dropMark).toBeUndefined();

    await grid.dropRow();
    expect(grid.reorders).toHaveLength(1);
  });

  it('nests and lifts tree rows from the keyboard', async () => {
    const grid = mountFiles();
    await grid.settle();

    await grid.focusCell(2, 1);
    await grid.press('ArrowRight', { alt: true, shift: true });
    expect(grid.reorders).toEqual([{ row: adr, from: 1, to: 0, parent: docs, toParent: plan }]);
    expect(grid.announcement).toBe('Строка «adr.md» перемещена в «plan.md», место 1 из 1');

    await grid.press('ArrowLeft', { alt: true, shift: true });

    expect(grid.reorders[1]).toEqual({
      row: adr,
      from: 1,
      to: 1,
      parent: docs,
      toParent: undefined,
    });

    expect(grid.announcement).toBe('Строка «adr.md» перемещена на верхний уровень, место 2 из 4');

    await grid.focusCell(0, 1);
    await grid.press('ArrowLeft', { alt: true, shift: true });
    expect(grid.reorders).toHaveLength(2);
  });
});
