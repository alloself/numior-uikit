import { describe, expect, it } from 'vite-plus/test';
import { createCommandStack } from '../src/table/table-commands';
import { EngineHarness, ORDERS, ORDER_TOTALS, type Order } from './harness/engine';

type EditableOrder = { -readonly [K in keyof Order]: Order[K] };

const QUERY = { sort: [{ key: 'amount', direction: 'desc' as const }], totals: true };

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
});
