import { describe, expect, it } from 'vite-plus/test';
import type { TableEngineColumn, TableNode } from '../src/engine';
import { EngineHarness, FOLDERS, FOLDER_COLUMNS, type Folder } from './harness/engine';

interface Counted {
  reads: number;
}

interface EditableFolder {
  readonly name: string;
  size: number | null;
  readonly items?: readonly EditableFolder[];
}

const label = (node: TableNode<Folder>): string =>
  node.kind === 'row'
    ? `${'  '.repeat(node.level)}${node.row.name}${node.expandable ? (node.expanded ? ' -' : ' +') : ''}`
    : 'group';

const FOLDER_TOTALS: readonly TableEngineColumn<Folder>[] = [
  { kind: 'string', key: 'name', value: (row) => row.name },
  { kind: 'number', key: 'size', value: (row) => row.size, aggregate: 'sum' },
  { kind: 'number', key: 'rows', value: (row) => row.size, aggregate: 'count' },
];

const TOTALS = { totals: true } as const;

const grove = (width: number, depth: number, prefix = 'n'): Folder[] =>
  Array.from({ length: width }, (_unused, index) => {
    const name = `${prefix}${String(index)}`;

    return depth === 0
      ? { name, size: 1 }
      : { name, size: null, items: grove(width, depth - 1, `${name}-`) };
  });

const shelves = (folders: number, files: number): Folder[] =>
  Array.from({ length: folders }, (_unused, index) => ({
    name: `n${String(index)}`,
    size: null,
    items: Array.from({ length: files }, (_file, position) => ({
      name: `n${String(index)}-${String(position)}`,
      size: 1,
    })),
  }));

const branchesOf = (rows: readonly Folder[]): string[] =>
  rows.flatMap((row) => (row.items === undefined ? [] : [row.name, ...branchesOf(row.items)]));

const groveHarness = (rows: readonly Folder[], counted?: Counted): EngineHarness<Folder> =>
  new EngineHarness(FOLDER_COLUMNS, rows, {
    children: (row) => row.items,
    keyOf: (row) => {
      if (counted !== undefined) {
        counted.reads += 1;
      }
      return row.name;
    },
    defaultExpanded: false,
  });

const walkedAfresh = (rows: readonly Folder[], open: ReadonlySet<string>): string[] => {
  const fresh = groveHarness(rows);

  fresh.engine.setToggled(open);

  return fresh.render(label);
};

const treeHarness = (defaultExpanded = true): EngineHarness<Folder> =>
  new EngineHarness(FOLDER_COLUMNS, FOLDERS, {
    children: (row) => row.items,
    keyOf: (row) => row.name,
    defaultExpanded,
  });

describe('createTableEngine trees', () => {
  it('tells the place of a node among its siblings and its parent', () => {
    const harness = treeHarness();

    expect(harness.engine.siblingsAt(2)).toEqual({
      index: 1,
      count: 3,
      parentIndex: 0,
      parent: FOLDERS[0],
    });

    expect(harness.engine.siblingsAt(4)).toMatchObject({ index: 0, count: 1, parentIndex: 3 });

    expect(harness.engine.siblingsAt(8)).toEqual({
      index: 2,
      count: 3,
      parentIndex: -1,
      parent: undefined,
    });

    expect(harness.engine.siblingsAt(9)).toBeUndefined();
  });

  it('flattens nested rows, sorts within siblings and exposes levels and expansion', async () => {
    const harness = treeHarness();

    expect(harness.render(label)).toEqual([
      'docs -',
      '  plan.md',
      '  adr.md',
      '  old -',
      '    notes.txt',
      'src -',
      '  index.ts',
      '  app.vue',
      'readme.md',
    ]);

    const result = await harness.runToEnd({ sort: [{ key: 'name', direction: 'asc' }] });

    expect(result).toEqual({ kind: 'done', count: 9, rows: 9 });

    expect(harness.render(label)).toEqual([
      'docs -',
      '  adr.md',
      '  old -',
      '    notes.txt',
      '  plan.md',
      'readme.md',
      'src -',
      '  app.vue',
      '  index.ts',
    ]);

    await harness.runToEnd({ sort: [{ key: 'size', direction: 'desc' }] });
    expect(harness.visible('name').slice(0, 4)).toEqual(['readme.md', 'docs', 'adr.md', 'plan.md']);

    expect(harness.engine.nodeAt(0)).toMatchObject({
      kind: 'row',
      id: 'readme.md',
      level: 0,
      expandable: false,
    });
  });

  it('keeps the ancestors of matching rows, collapses subtrees and refuses grouping', async () => {
    const harness = treeHarness();

    await harness.runToEnd({
      filters: [{ kind: 'text', key: 'name', op: 'contains', value: 'md' }],
      sort: [{ key: 'name', direction: 'asc' }],
    });

    expect(harness.render(label)).toEqual(['docs -', '  adr.md', '  plan.md', 'readme.md']);
    expect(harness.engine.rowCount()).toBe(4);
    expect(harness.phases).toEqual(['keys', 'filter', 'sort']);

    harness.engine.setExpanded('docs', false);
    expect(harness.render(label)).toEqual(['docs +', 'readme.md']);
    expect(harness.engine.rowCount()).toBe(4);
    expect(Array.from(harness.engine.visibleIndices())).toHaveLength(4);

    harness.engine.toggle(0);
    expect(harness.engine.count()).toBe(4);

    harness.engine.toggle(1);
    expect(harness.engine.count()).toBe(4);

    const collapsed = treeHarness(false);
    expect(collapsed.render(label)).toEqual(['docs +', 'src +', 'readme.md']);

    collapsed.engine.toggle(0);

    expect(collapsed.render(label)).toEqual([
      'docs -',
      '  plan.md',
      '  adr.md',
      '  old +',
      'src +',
      'readme.md',
    ]);

    await expect(collapsed.run({ groupBy: ['name'] })).rejects.toThrow(
      'cannot group rows of a tree',
    );
  });

  it('marks rows with children still to load as expandable until the children arrive', () => {
    const lazy: Folder = { name: 'lazy', size: null };

    const harness = new EngineHarness(FOLDER_COLUMNS, [...FOLDERS, lazy], {
      children: (row) => row.items,
      hasChildren: (row) => row.name === 'lazy' || row.name === 'readme.md',
      keyOf: (row) => row.name,
      defaultExpanded: false,
    });

    expect(harness.render(label)).toEqual(['docs +', 'src +', 'readme.md +', 'lazy +']);
    expect(harness.engine.nodeAt(3)).toMatchObject({ expandable: true, unloaded: true });
    expect(harness.engine.nodeAt(0)).toMatchObject({ expandable: true, unloaded: false });

    harness.engine.setToggled(['lazy']);
    expect(harness.render(label).at(-1)).toBe('lazy -');

    harness.engine.setRows([...FOLDERS, { ...lazy, items: [{ name: 'child.txt', size: 1 }] }]);
    harness.engine.setToggled(['lazy']);

    expect(harness.render(label).slice(-2)).toEqual(['lazy -', '  child.txt']);
    expect(harness.engine.nodeAt(3)).toMatchObject({ expandable: true, unloaded: false });
  });

  it('sums the rows left after the filters, the ancestors of matches among them', async () => {
    const harness = new EngineHarness(FOLDER_TOTALS, FOLDERS, {
      children: (row) => row.items,
      keyOf: (row) => row.name,
    });

    await harness.runToEnd(TOTALS);

    expect(harness.engine.totals()).toEqual({ size: 32, rows: 9 });

    await harness.runToEnd({
      ...TOTALS,
      filters: [{ kind: 'text', key: 'name', op: 'contains', value: 'md' }],
    });

    expect(harness.engine.rowCount()).toBe(4);
    expect(harness.engine.totals()).toEqual({ size: 10, rows: 4 });
    expect(harness.phases).toContain('group');
  });

  it('follows a changed value in the totals of a tree without walking it again', async () => {
    const file: EditableFolder = { name: 'a.md', size: 2 };
    const rows: EditableFolder[] = [{ name: 'docs', size: null, items: [file] }];

    const harness = new EngineHarness<EditableFolder>(FOLDER_TOTALS, rows, {
      children: (row) => row.items,
      keyOf: (row) => row.name,
    });

    await harness.runToEnd(TOTALS);
    file.size = 40;
    harness.engine.patch(TOTALS, ['size']);

    expect(harness.engine.totals()).toEqual({ size: 40, rows: 2 });
    expect(harness.render(label)).toEqual(['docs -', '  a.md']);
  });

  it('shows after every opening and closing what a fresh walk of the tree shows', () => {
    const rows = grove(3, 3);
    const branches = branchesOf(rows);
    const harness = groveHarness(rows);
    const open = new Set<string>();

    for (let step = 0; step < 240; step += 1) {
      const name = branches[(step * 17 + (step % 5) * 3) % branches.length] ?? '';

      if (!open.delete(name)) {
        open.add(name);
      }

      if (step % 3 === 0) {
        harness.engine.setToggled(open);
      } else {
        harness.engine.setExpanded(name, open.has(name));
      }

      expect(harness.render(label)).toEqual(walkedAfresh(rows, open));
    }
  });

  it('shows what a fresh walk shows when many nodes open and close in one go', () => {
    const rows = grove(3, 3);
    const branches = branchesOf(rows);
    const harness = groveHarness(rows);
    const many = new Set(branches.filter((_name, index) => index % 2 === 0));
    const others = new Set(branches.filter((_name, index) => index % 3 === 0));

    harness.engine.setToggled(many);

    expect(harness.render(label)).toEqual(walkedAfresh(rows, many));

    harness.engine.setToggled(others);

    expect(harness.render(label)).toEqual(walkedAfresh(rows, others));
  });

  it('opens a node by reading the rows under it, not the whole tree', () => {
    const counted: Counted = { reads: 0 };
    const harness = groveHarness(shelves(2000, 5), counted);

    counted.reads = 0;
    harness.engine.setToggled(['n3']);

    expect(harness.engine.count()).toBe(2005);
    expect(counted.reads).toBeLessThan(50);

    counted.reads = 0;
    harness.engine.setExpanded('n3', false);

    expect(harness.engine.count()).toBe(2000);
    expect(counted.reads).toBeLessThan(50);
  });
});
