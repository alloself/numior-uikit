import { describe, expect, it } from 'vite-plus/test';
import type { TableNode } from '../src/engine';
import { EngineHarness, FOLDERS, FOLDER_COLUMNS, type Folder } from './harness/engine';

const label = (node: TableNode<Folder>): string =>
  node.kind === 'row'
    ? `${'  '.repeat(node.level)}${node.row.name}${node.expandable ? (node.expanded ? ' -' : ' +') : ''}`
    : 'group';

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
});
