import { describe, expect, it } from 'vite-plus/test';
import type { TableNode } from '../src/engine';
import {
  EngineHarness,
  FOLDER_COLUMNS,
  FOLDERS,
  ORDER_TOTALS,
  ORDERS,
  type Folder,
  type Order,
} from './harness/engine';

const label = (node: TableNode<Order>): string => {
  switch (node.kind) {
    case 'group':
      return `${node.key}=${String(node.value)}`;
    case 'detail':
      return `detail of #${node.row.id} at level ${node.level}`;
    case 'row':
      return `#${node.row.id}`;
  }
};

const withDetails = (): EngineHarness<Order> =>
  new EngineHarness(ORDER_TOTALS, ORDERS, {
    keyOf: (row) => row.id,
    detail: (row) => row.id !== 3,
    defaultExpanded: false,
  });

describe('createTableEngine detail rows', () => {
  it('puts a detail node after its opened row and reports where the details sit', () => {
    const harness = withDetails();

    expect(harness.engine.count()).toBe(6);
    expect(harness.engine.details()).toEqual([]);

    expect(harness.engine.nodeAt(1)).toMatchObject({
      kind: 'row',
      expandable: true,
      expanded: false,
    });

    expect(harness.engine.nodeAt(2)).toMatchObject({ kind: 'row', expandable: false });

    harness.engine.setToggled([2, 5]);
    expect(harness.engine.count()).toBe(8);
    expect(harness.engine.rowCount()).toBe(6);
    expect(harness.engine.details()).toEqual([2, 6]);

    expect(harness.render(label)).toEqual([
      '#1',
      '#2',
      'detail of #2 at level 1',
      '#3',
      '#4',
      '#5',
      'detail of #5 at level 1',
      '#6',
    ]);

    expect(harness.engine.nodeAt(1)).toMatchObject({ expanded: true });
    expect(harness.engine.nodeAt(2)).toEqual({ kind: 'detail', id: 2, row: ORDERS[1], level: 1 });
    expect(harness.engine.siblingsAt(2)).toBeUndefined();
  });

  it('keeps a detail closed for rows without one and ignores a toggle on the detail itself', () => {
    const harness = withDetails();

    harness.engine.setToggled([3]);
    expect(harness.engine.count()).toBe(6);

    harness.engine.toggle(0);
    expect(harness.engine.details()).toEqual([1]);

    harness.engine.toggle(1);
    expect(harness.engine.details()).toEqual([1]);

    harness.engine.toggle(0);
    expect(harness.engine.count()).toBe(6);
  });

  it('moves the detail with its row through sorting, filters and groups', async () => {
    const harness = withDetails();

    harness.engine.setToggled([1]);
    await harness.runToEnd({ sort: [{ key: 'amount', direction: 'desc' }] });

    expect(harness.render(label)).toEqual([
      '#5',
      '#2',
      '#6',
      '#1',
      'detail of #1 at level 1',
      '#4',
      '#3',
    ]);

    await harness.runToEnd({ filters: [{ kind: 'set', key: 'country', values: ['AM'] }] });
    expect(harness.engine.details()).toEqual([]);

    await harness.runToEnd({ groupBy: ['country'] });
    harness.engine.setToggled([1, '["RU"]']);

    expect(harness.render(label)).toEqual([
      'country=AM',
      'country=KZ',
      'country=RU',
      '#1',
      'detail of #1 at level 2',
      '#2',
      '#4',
    ]);

    expect(harness.engine.details()).toEqual([4]);
    expect(harness.engine.rowCount()).toBe(6);
  });

  it('leaves details out of a tree, where rows open their children', () => {
    const harness = new EngineHarness<Folder>(FOLDER_COLUMNS, FOLDERS, {
      keyOf: (row) => row.name,
      children: (row) => row.items,
      detail: () => true,
      defaultExpanded: false,
    });

    harness.engine.setToggled(['readme.md', 'docs']);
    expect(harness.engine.details()).toEqual([]);
    expect(harness.nodes().every((node) => node.kind === 'row')).toBe(true);
    expect(harness.engine.nodeAt(4)).toMatchObject({ kind: 'row', expandable: true });
    expect(harness.engine.nodeAt(5)).toMatchObject({ kind: 'row', expandable: false });
  });
});
