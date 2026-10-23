import { describe, expect, it } from 'vite-plus/test';
import type { TableEngineColumn } from '../src/engine';
import { CHECK_INTERVAL } from '../src/engine/slicer';
import { EngineHarness, ORDERS, ORDER_COLUMNS, type Order } from './harness/engine';

interface Account {
  readonly email: string;
  readonly score: number;
}

const ACCOUNT_COLUMNS: readonly TableEngineColumn<Account>[] = [
  { kind: 'string', key: 'email', value: (row) => row.email },
  { kind: 'number', key: 'score', value: (row) => row.score },
];

const ROWS = 50_000;
const PASS = Math.floor(ROWS / CHECK_INTERVAL);

const accounts = (count: number): Account[] =>
  Array.from({ length: count }, (_, index) => ({
    email: `User${index}@Example.com`,
    score: (index * 7919) % count,
  }));

const ids = async (
  harness: EngineHarness<Order>,
  filters: Parameters<EngineHarness<Order>['run']>[0]['filters'],
): Promise<number[]> => {
  await harness.runToEnd({ filters, sort: [{ key: 'id', direction: 'asc' }] });
  return harness.visible('id');
};

describe('createTableEngine filters', () => {
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

  it('matches value sets with blanks, searches every string column quickly and combines filters', async () => {
    const harness = new EngineHarness(ORDER_COLUMNS, ORDERS);

    expect(await ids(harness, [{ kind: 'set', key: 'city', values: ['Moscow', null] }])).toEqual([
      1, 4, 5,
    ]);

    expect(await ids(harness, [{ kind: 'set', key: 'note', values: [null] }])).toEqual([2, 3]);
    expect(await ids(harness, [{ kind: 'set', key: 'paid', values: [true] }])).toEqual([1, 4, 6]);
    expect(await ids(harness, [{ kind: 'set', key: 'country', values: ['KZ'] }])).toEqual([5, 6]);
    expect(await ids(harness, [{ kind: 'quick', value: 'kaz' }])).toEqual([2]);
    expect(harness.engine.store('city')?.kind).toBe('codes');
    expect(await ids(harness, [{ kind: 'quick', value: 'UR' }])).toEqual([1, 6]);
    expect(await ids(harness, [{ kind: 'quick', value: '' }])).toEqual([1, 2, 3, 4, 5, 6]);
    expect(await ids(harness, [{ kind: 'quick', value: 'UR', keys: ['note'] }])).toEqual([1, 6]);

    expect(await ids(harness, [{ kind: 'quick', value: 'UR', keys: ['city', 'country'] }])).toEqual(
      [],
    );

    expect(await ids(harness, [{ kind: 'quick', value: 'UR', keys: ['amount'] }])).toEqual([]);

    expect(
      await ids(harness, [
        { kind: 'set', key: 'country', values: ['RU'] },
        { kind: 'number', key: 'amount', min: 100 },
      ]),
    ).toEqual([1, 2]);

    expect(harness.engine.rowCount()).toBe(2);
    expect(Array.from(harness.engine.visibleIndices())).toEqual([0, 1]);

    const coded = harness.engine.store('note');
    await harness.runToEnd({ sort: [{ key: 'note', direction: 'asc' }] });
    const ranked = harness.engine.store('note');

    expect(coded?.kind).toBe('codes');
    expect(ranked?.kind).toBe('string');
    expect(ranked !== undefined && coded !== undefined && ranked.nulls === coded.nulls).toBe(true);

    expect(harness.visible('note')).toEqual([
      '',
      'Gift',
      'gift wrap',
      'urgent',
      'URGENT call',
      null,
    ]);
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

  it('lists distinct values in collator order with a limit and one blank marker for null and empty text', async () => {
    const harness = new EngineHarness(ORDER_COLUMNS, ORDERS);

    expect(await harness.settle(harness.engine.distinct('city'))).toEqual({
      values: ['Almaty', 'Kazan', 'Moscow', 'Yerevan', null],
      truncated: false,
    });

    expect(await harness.settle(harness.engine.distinct('city', { limit: 2 }))).toEqual({
      values: ['Almaty', 'Kazan'],
      truncated: true,
    });

    expect(await harness.settle(harness.engine.distinct('note'))).toEqual({
      values: ['Gift', 'gift wrap', 'urgent', 'URGENT call', null],
      truncated: false,
    });

    expect(await harness.settle(harness.engine.distinct('note', { limit: 4 }))).toEqual({
      values: ['Gift', 'gift wrap', 'urgent', 'URGENT call', null],
      truncated: false,
    });

    expect(await harness.settle(harness.engine.distinct('note', { limit: 3 }))).toEqual({
      values: ['Gift', 'gift wrap', 'urgent'],
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

  it('yields at every clock check while it builds a store, scans dictionaries, filters rows and lists numbers', async () => {
    const harness = new EngineHarness(ACCOUNT_COLUMNS, accounts(ROWS), { sliceMs: 0 });

    await harness.runToEnd({
      filters: [{ kind: 'set', key: 'email', values: ['User7@Example.com', 'nobody'] }],
    });

    expect(harness.engine.rowCount()).toBe(1);
    expect(harness.slices).toBeGreaterThanOrEqual(3 * PASS);

    expect(
      await harness.runToEnd({ filters: [{ kind: 'quick', value: 'user1234' }] }),
    ).toMatchObject({ rows: 11 });

    expect(harness.slices).toBeGreaterThanOrEqual(5 * PASS);

    await harness.runToEnd({
      filters: [{ kind: 'text', key: 'email', op: 'starts', value: 'USER299' }],
    });

    expect(harness.engine.rowCount()).toBe(111);
    expect(harness.slices).toBeGreaterThanOrEqual(7 * PASS);

    expect(await harness.settle(harness.engine.distinct('score', { limit: 3 }))).toEqual({
      values: [0, 1, 2],
      truncated: true,
    });

    expect(harness.slices).toBeGreaterThanOrEqual(9 * PASS);
  });
});
