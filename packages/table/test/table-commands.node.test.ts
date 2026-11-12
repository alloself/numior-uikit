import { describe, expect, it } from 'vite-plus/test';
import { createCommandStack } from '../src/table/table-commands';
import type { TableEngineColumn } from '../src/engine';
import { EngineHarness, ORDERS, ORDER_TOTALS, type Order } from './harness/engine';

type EditableOrder = { -readonly [K in keyof Order]: Order[K] };

interface Reads {
  count: number;
}

const QUERY = { sort: [{ key: 'amount', direction: 'desc' as const }], totals: true };

const watchedTotals = (reads: Reads): TableEngineColumn<EditableOrder>[] => {
  const amount = (row: EditableOrder): number | null => {
    reads.count += 1;
    return row.amount;
  };

  return [
    { kind: 'string', key: 'city', value: (row) => row.city, aggregate: 'count' },
    { kind: 'number', key: 'amount', value: amount, aggregate: 'sum' },
    { kind: 'number', key: 'average', value: amount, aggregate: 'avg' },
    { kind: 'number', key: 'largest', value: amount, aggregate: 'max' },
  ];
};

describe('table edits', () => {
  it('undoes and redoes in order, forgets redo after a new command and keeps a bounded history', () => {
    const stack = createCommandStack<string>(2);

    stack.push('a');
    stack.push('b');
    stack.push('c');
    expect(stack.undo()).toBe('c');
    expect(stack.undo()).toBe('b');
    expect(stack.undo()).toBeUndefined();
    expect(stack.redo()).toBe('b');

    stack.push('d');
    expect(stack.redo()).toBeUndefined();
    expect(stack.undo()).toBe('d');

    stack.clear();
    expect(stack.undo()).toBeUndefined();
  });

  it('patches changed keys so totals follow the new values while the order stays', async () => {
    const rows: EditableOrder[] = ORDERS.map((row) => ({ ...row }));
    const harness = new EngineHarness<EditableOrder>(ORDER_TOTALS, rows);

    const ids = (): string[] =>
      harness.render((node) => (node.kind === 'row' ? `#${node.row.id}` : ''));

    await harness.runToEnd(QUERY);
    expect(ids()).toEqual(['#5', '#2', '#6', '#1', '#4', '#3']);
    expect(harness.engine.totals()['amount']).toBe(845);

    const first = rows[0];

    if (first !== undefined) {
      first.amount = 1000;
    }

    harness.engine.patch(QUERY, ['amount']);
    expect(ids()).toEqual(['#5', '#2', '#6', '#1', '#4', '#3']);
    expect(harness.engine.totals()['amount']).toBe(1745);
    expect(harness.engine.totals()['largest']).toBe(1000);

    await harness.runToEnd(QUERY);
    expect(ids()).toEqual(['#1', '#5', '#2', '#6', '#4', '#3']);
  });

  it('reads again only the rows a patch names, in every column that has a total', async () => {
    const reads: Reads = { count: 0 };
    const rows: EditableOrder[] = ORDERS.map((row) => ({ ...row }));
    const harness = new EngineHarness<EditableOrder>(watchedTotals(reads), rows);
    const [first, , third] = rows;

    await harness.runToEnd(QUERY);

    if (first === undefined || third === undefined) {
      throw new Error('The orders are missing');
    }

    first.amount = 1000;
    third.amount = 5;
    reads.count = 0;
    harness.engine.patch(QUERY, ['amount'], [first, third]);

    expect(harness.engine.totals()).toEqual({
      city: 6,
      amount: 1750,
      average: 291.666_666_666_666_7,
      largest: 1000,
    });

    expect(reads.count).toBe(6);

    first.amount = null;
    harness.engine.patch(QUERY, ['amount'], [first]);

    expect(harness.engine.totals()).toEqual({ city: 6, amount: 750, average: 150, largest: 300 });
  });

  it('counts every row again when a patch names a row the table does not hold', async () => {
    const rows: EditableOrder[] = ORDERS.map((row) => ({ ...row }));
    const harness = new EngineHarness<EditableOrder>(ORDER_TOTALS, rows);
    const [first] = rows;

    await harness.runToEnd(QUERY);

    if (first === undefined) {
      throw new Error('The orders are missing');
    }

    first.amount = 1000;
    harness.engine.patch(QUERY, ['amount'], [{ ...first }]);

    expect(harness.engine.totals()['amount']).toBe(1745);
    expect(harness.engine.totals()['largest']).toBe(1000);
  });
});
