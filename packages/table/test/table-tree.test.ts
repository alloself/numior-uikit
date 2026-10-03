import { afterEach, describe, expect, it } from 'vitest';
import { TableDriver, type TableMountOptions } from './drivers/table';
import { FILE_COLUMNS, FILES, type FileNode } from './support/files';

const mounted: Array<{ unmount(): void }> = [];

const mountFiles = (options: Partial<TableMountOptions<FileNode>> = {}): TableDriver<FileNode> => {
  const grid = TableDriver.mount<FileNode>({
    columns: FILE_COLUMNS,
    rows: FILES,
    config: { locale: 'ru-RU' },
    ...options,
    props: {
      getKey: (row) => row.path,
      getChildren: (row) => row.items,
      hasChildren: (row) => row.lazy === true,
      ...options.props,
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

describe('NuiTable tree rows', () => {
  it('shows collapsed tree rows with levels and expands them by click and keys', async () => {
    const grid = mountFiles();
    await grid.settle();

    expect(grid.role).toBe('treegrid');
    expect(grid.rowCount).toBe(4);
    expect(grid.rowLevel(0)).toBe('1');
    expect(grid.rowExpanded(0)).toBe('false');
    expect(grid.rowExpanded(2)).toBeUndefined();
    expect(grid.treeLevel(0)).toBe('0');
    expect(grid.treeLevel(2)).toBeUndefined();
    await grid.toggleRow(0);

    expect(grid.expanded).toEqual(['docs']);
    expect(grid.focusedCell).toBeUndefined();
    expect(grid.rowCount).toBe(7);
    expect(grid.cellText(1, 0)).toBe('plan.md');
    expect(grid.rowLevel(1)).toBe('2');
    expect(grid.treeLevel(1)).toBe('1');
    expect(grid.announcement).toBe('Строка «docs» развёрнута');
    await grid.focusCell(3, 0);
    await grid.press('Enter');

    expect(grid.expanded).toEqual(['docs', 'docs/old']);
    expect(grid.cellText(4, 0)).toBe('notes.txt');
    expect(grid.rowLevel(4)).toBe('3');
    await grid.focusCell(3, 1);
    await grid.press('Enter');
    expect(grid.expanded).toEqual(['docs', 'docs/old']);
    await grid.focusCell(0, 0);
    await grid.press(' ');
    expect(grid.expanded).toEqual(['docs/old']);
    expect(grid.rowCount).toBe(4);
    expect(grid.announcement).toBe('Строка «docs» свёрнута');
  });

  it('asks for lazy children, marks the row busy and shows them when the rows bring them', async () => {
    const grid = mountFiles();
    await grid.toggleRow(1);

    expect(grid.loads.map((row) => row.path)).toEqual(['src']);
    expect(grid.rowBusy(1)).toBe(true);
    expect(grid.rowExpanded(1)).toBe('true');
    expect(grid.rowCount).toBe(4);

    await grid.setSource(
      FILES.map((row) =>
        row.path === 'src'
          ? { ...row, items: [{ path: 'src/index.ts', name: 'index.ts', size: 8 }] }
          : row,
      ),
    );

    expect(grid.rowBusy(1)).toBe(false);
    expect(grid.cellText(2, 0)).toBe('index.ts');
    expect(grid.rowCount).toBe(5);
  });

  it('keeps tree rows when a grouping is set and sorts siblings', async () => {
    const grid = mountFiles({
      groupBy: ['size'],
      sort: [{ key: 'name', direction: 'desc' }],
      expanded: ['docs'],
    });

    await grid.settle();

    expect(grid.role).toBe('treegrid');
    expect(grid.cellText(0, 0)).toBe('src');
    expect(grid.cellText(1, 0)).toBe('readme.md');
    expect(grid.cellText(2, 0)).toBe('docs');
    expect(grid.cellText(3, 0)).toBe('plan.md');
    expect(grid.cellText(4, 0)).toBe('old');
  });
});
