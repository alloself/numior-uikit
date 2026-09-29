import { describe, expect, it } from 'vitest';
import type { TableNode } from '../src/engine';
import { EngineHarness, ORDERS, ORDER_TOTALS, type Order } from './harness/engine';

const label = (node: TableNode<Order>): string =>
  node.kind === 'group'
    ? `${'  '.repeat(node.level)}${node.key}=${String(node.value)} (${node.count}) sum=${String(node.aggregates['amount'])} count=${String(node.aggregates['id'])}`
    : `${'  '.repeat(node.level)}#${node.row.id}`;

describe('createTableEngine groups', () => {
  it('groups by one and two keys, sorts inside groups and aggregates each group and the total', async () => {
    const harness = new EngineHarness(ORDER_TOTALS, ORDERS);

    const result = await harness.runToEnd({
      groupBy: ['country'],
      sort: [{ key: 'amount', direction: 'desc' }],
    });

    expect(result).toEqual({ kind: 'done', count: 9, rows: 6 });
    expect(harness.phases).toEqual(['keys', 'sort', 'group']);

    expect(harness.render(label)).toEqual([
      'country=AM (1) sum=0 count=1',
      '  #3',
      'country=KZ (2) sum=420 count=2',
      '  #5',
      '  #6',
      'country=RU (3) sum=425 count=3',
      '  #2',
      '  #1',
      '  #4',
    ]);

    const groups = harness.nodes().flatMap((node) => (node.kind === 'group' ? [node] : []));

    expect(groups[0]?.aggregates).toEqual({
      id: 1,
      amount: 0,
      average: null,
      largest: null,
      note: '',
    });

    expect(groups[2]?.aggregates['average']).toBeCloseTo(425 / 3);
    expect(groups[2]?.aggregates['largest']).toBe(250);
    expect(groups[1]?.aggregates['note']).toBe('gift wrap|URGENT call');
    expect(groups[2]?.id).toBe('["RU"]');
    expect(groups[2]?.path).toEqual(['RU']);

    expect(harness.engine.totals()).toEqual({
      id: 6,
      amount: 845,
      average: 169,
      largest: 300,
      note: '|gift wrap|URGENT call|·|urgent|Gift',
    });

    await harness.runToEnd({
      groupBy: ['country', 'city'],
      sort: [{ key: 'id', direction: 'asc' }],
    });

    expect(harness.render(label)).toEqual([
      'country=AM (1) sum=0 count=1',
      '  city=Yerevan (1) sum=0 count=1',
      '    #3',
      'country=KZ (2) sum=420 count=2',
      '  city=Almaty (1) sum=120 count=1',
      '    #6',
      '  city=null (1) sum=300 count=1',
      '    #5',
      'country=RU (3) sum=425 count=3',
      '  city=Kazan (1) sum=250 count=1',
      '    #2',
      '  city=Moscow (2) sum=175 count=2',
      '    #1',
      '    #4',
    ]);

    expect(Array.from(harness.engine.visibleIndices())).toEqual([2, 5, 4, 1, 0, 3]);
  });

  it('collapses and expands groups by id or position and can start collapsed', async () => {
    const harness = new EngineHarness(ORDER_TOTALS, ORDERS);
    await harness.runToEnd({ groupBy: ['country', 'city'] });
    expect(harness.engine.count()).toBe(14);

    harness.engine.setExpanded('["RU"]', false);
    expect(harness.engine.count()).toBe(9);
    expect(harness.engine.isExpanded('["RU"]')).toBe(false);
    expect(harness.render(label).at(-1)).toBe('country=RU (3) sum=425 count=3');

    harness.engine.toggle(3);

    expect(harness.render(label)).toEqual([
      'country=AM (1) sum=0 count=1',
      '  city=Yerevan (1) sum=0 count=1',
      '    #3',
      'country=KZ (2) sum=420 count=2',
      'country=RU (3) sum=425 count=3',
    ]);

    harness.engine.toggle(3);
    harness.engine.setExpanded('["RU"]', true);
    expect(harness.engine.count()).toBe(14);
    harness.engine.toggle(2);
    expect(harness.engine.count()).toBe(14);

    const collapsed = new EngineHarness(ORDER_TOTALS, ORDERS, { defaultExpanded: false });
    await collapsed.runToEnd({ groupBy: ['country'] });

    expect(collapsed.render(label)).toEqual([
      'country=AM (1) sum=0 count=1',
      'country=KZ (2) sum=420 count=2',
      'country=RU (3) sum=425 count=3',
    ]);

    collapsed.engine.setExpanded('["KZ"]', true);
    expect(collapsed.engine.count()).toBe(5);
    collapsed.engine.setToggled(['["AM"]', '["RU"]']);
    expect(collapsed.engine.count()).toBe(7);
    expect(collapsed.engine.isExpanded('["KZ"]')).toBe(false);
    collapsed.engine.setToggled(['["KZ"]']);
    expect(collapsed.engine.count()).toBe(5);
    collapsed.engine.setRows(ORDERS.slice(0, 2));
    expect(collapsed.engine.isExpanded('["KZ"]')).toBe(false);
  });

  it('computes totals only when asked or grouping and reports the group phase progress', async () => {
    const harness = new EngineHarness(ORDER_TOTALS, ORDERS);
    const onlyRussia = [{ kind: 'set', key: 'country', values: ['RU'] }] as const;

    expect(await harness.runToEnd({ filters: onlyRussia })).toEqual({
      kind: 'done',
      count: 3,
      rows: 3,
    });

    expect(harness.engine.totals()).toEqual({});
    expect(harness.engine.store('amount')).toBeUndefined();
    expect(harness.phases).toEqual(['keys', 'filter']);

    const result = await harness.runToEnd({ filters: onlyRussia, totals: true });

    expect(result).toEqual({ kind: 'done', count: 3, rows: 3 });
    expect(harness.engine.totals()).toMatchObject({ id: 3, amount: 425, largest: 250 });
    expect(harness.nodes().every((node) => node.kind === 'row' && node.level === 0)).toBe(true);
    expect(harness.progress.at(-1)).toMatchObject({ phase: 'group', done: 3, total: 3 });
  });
});
