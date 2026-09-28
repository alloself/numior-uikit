import { describe, expect, it } from 'vitest';
import { EngineHarness, ORDERS, ORDER_COLUMNS, type Order } from './harness/engine';

const ids = async (
  harness: EngineHarness<Order>,
  filters: Parameters<EngineHarness<Order>['run']>[0]['filters'],
): Promise<number[]> => {
  await harness.runToEnd({ filters, sort: [{ key: 'id', direction: 'asc' }] });
  return harness.visible('id');
};

describe('createGridEngine filters', () => {
  it('matches text by contains, equals, starts and empty regardless of case', async () => {
    const harness = new EngineHarness(ORDER_COLUMNS, ORDERS);

    expect(
      await ids(harness, [{ kind: 'text', key: 'note', op: 'contains', value: 'gift' }]),
    ).toEqual([4, 5]);

    expect(
      await ids(harness, [{ kind: 'text', key: 'note', op: 'equals', value: 'Urgent' }]),
    ).toEqual([1]);

    expect(await ids(harness, [{ kind: 'text', key: 'note', op: 'starts', value: 'urg' }])).toEqual(
      [1, 6],
    );

    expect(await ids(harness, [{ kind: 'text', key: 'note', op: 'empty', value: '' }])).toEqual([
      2, 3,
    ]);

    expect(harness.phases).toEqual(['keys', 'filter', 'sort']);
  });

  it('bounds numbers and dates from either side and drops missing values inside a range', async () => {
    const harness = new EngineHarness(ORDER_COLUMNS, ORDERS);

    expect(await ids(harness, [{ kind: 'number', key: 'amount', min: 100 }])).toEqual([1, 2, 5, 6]);
    expect(await ids(harness, [{ kind: 'number', key: 'amount', max: 100 }])).toEqual([1, 4]);

    expect(await ids(harness, [{ kind: 'number', key: 'amount', min: 100, max: 150 }])).toEqual([
      1, 6,
    ]);

    expect(await ids(harness, [{ kind: 'number', key: 'amount' }])).toEqual([1, 2, 3, 4, 5, 6]);

    const january = {
      kind: 'date',
      key: 'created',
      from: Date.UTC(2024, 0, 1),
      to: Date.UTC(2024, 0, 31),
    } as const;

    expect(await ids(harness, [january])).toEqual([1, 6]);
    expect(await ids(harness, [{ kind: 'number', key: 'paid', min: 1 }])).toEqual([1, 4, 6]);
  });

  it('matches value sets with null, searches every string column quickly and combines filters', async () => {
    const harness = new EngineHarness(ORDER_COLUMNS, ORDERS);

    expect(await ids(harness, [{ kind: 'set', key: 'city', values: ['Moscow', null] }])).toEqual([
      1, 4, 5,
    ]);

    expect(await ids(harness, [{ kind: 'set', key: 'paid', values: [true] }])).toEqual([1, 4, 6]);
    expect(await ids(harness, [{ kind: 'set', key: 'country', values: ['KZ'] }])).toEqual([5, 6]);
    expect(await ids(harness, [{ kind: 'quick', value: 'kaz' }])).toEqual([2]);
    expect(await ids(harness, [{ kind: 'quick', value: 'UR' }])).toEqual([1, 6]);
    expect(await ids(harness, [{ kind: 'quick', value: '' }])).toEqual([1, 2, 3, 4, 5, 6]);

    expect(
      await ids(harness, [
        { kind: 'set', key: 'country', values: ['RU'] },
        { kind: 'number', key: 'amount', min: 100 },
      ]),
    ).toEqual([1, 2]);

    expect(harness.engine.rowCount()).toBe(2);
    expect(Array.from(harness.engine.visibleIndices())).toEqual([0, 1]);
  });

  it('rejects filters on columns of another kind', async () => {
    const harness = new EngineHarness(ORDER_COLUMNS, ORDERS);

    await expect(
      harness.run({ filters: [{ kind: 'text', key: 'amount', op: 'contains', value: '1' }] }),
    ).rejects.toThrow('needs a string column "amount"');

    await expect(
      harness.run({ filters: [{ kind: 'date', key: 'amount', from: 0 }] }),
    ).rejects.toThrow('needs a date column "amount"');

    await expect(
      harness.run({ filters: [{ kind: 'number', key: 'city', min: 0 }] }),
    ).rejects.toThrow('needs a number or boolean column "city"');
  });

  it('lists distinct values in collator order with a limit and a null marker', async () => {
    const harness = new EngineHarness(ORDER_COLUMNS, ORDERS);

    expect(await harness.settle(harness.engine.distinct('city'))).toEqual({
      values: ['Almaty', 'Kazan', 'Moscow', 'Yerevan', null],
      truncated: false,
    });

    expect(await harness.settle(harness.engine.distinct('city', { limit: 2 }))).toEqual({
      values: ['Almaty', 'Kazan'],
      truncated: true,
    });

    expect(await harness.settle(harness.engine.distinct('paid'))).toEqual({
      values: [false, true, null],
      truncated: false,
    });

    expect(await harness.settle(harness.engine.distinct('amount', { limit: 3 }))).toEqual({
      values: [75, 100, 120],
      truncated: true,
    });

    const controller = new AbortController();
    controller.abort();

    expect(
      await harness.settle(harness.engine.distinct('note', { signal: controller.signal })),
    ).toBeNull();
  });
});
