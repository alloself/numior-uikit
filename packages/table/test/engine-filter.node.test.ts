import { describe, expect, it } from 'vite-plus/test';
import type { TableEngineColumn } from '../src/engine';
import { CHECK_INTERVAL } from '../src/engine/slicer';
import { EngineHarness, ORDERS, ORDER_COLUMNS, type Order } from './harness/engine';
import { recordingRankHost, shuffledOrder } from './harness/rank-host';

interface Account {
  readonly email: string;
  readonly score: number;
}

interface Note {
  readonly text: string | null;
}

const ACCOUNT_COLUMNS: readonly TableEngineColumn<Account>[] = [
  { kind: 'string', key: 'email', value: (row) => row.email },
  { kind: 'number', key: 'score', value: (row) => row.score },
];

const NOTE_COLUMNS: readonly TableEngineColumn<Note>[] = [
  { kind: 'string', key: 'text', value: (row) => row.text },
];

const PIECES = ['a', 'A', 'á', 'b', '1', '01', '10', '2', 'ё', 'е', ' '] as const;

const DISTINCT_ASKS = [
  { limit: 1 },
  { limit: 3 },
  { limit: 12 },
  { limit: 1000 },
  { search: 'a', limit: 5 },
  { search: '1', limit: 1000 },
  { search: 'zz' },
] as const;

const ROWS = 50_000;
const UNIQUE_ROWS = 200_000;
const SORTED_ROWS = 500_000;
const PASS = Math.floor(ROWS / CHECK_INTERVAL);

const accounts = (count: number): Account[] =>
  Array.from({ length: count }, (_, index) => ({
    email: `User${index}@Example.com`,
    score: (index * 7919) % count,
  }));

const notes = (seed: number, count: number): Note[] => {
  let state = seed;

  const next = (): number => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state >>> 16;
  };

  return Array.from({ length: count }, () => {
    if (next() % 12 === 0) {
      return { text: null };
    }

    const length = next() % 4;

    return { text: Array.from({ length }, () => PIECES[next() % PIECES.length]).join('') };
  });
};

const noteLists = async (rows: readonly Note[], sorted: boolean) => {
  const harness = new EngineHarness(NOTE_COLUMNS, rows);

  if (sorted) {
    await harness.runToEnd({ sort: [{ key: 'text', direction: 'asc' }] });
  }

  const found = await Promise.all(
    DISTINCT_ASKS.map((ask) => harness.settle(harness.engine.distinct('text', ask))),
  );

  return { kind: harness.engine.store('text')?.kind, found };
};

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

  it('keeps rows without a value when the text to look for is empty', async () => {
    const harness = new EngineHarness(ORDER_COLUMNS, ORDERS);

    expect(await ids(harness, [{ kind: 'text', key: 'note', op: 'contains', value: '' }])).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);

    expect(await ids(harness, [{ kind: 'text', key: 'note', op: 'starts', value: '' }])).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);

    expect(await ids(harness, [{ kind: 'text', key: 'note', op: 'equals', value: '' }])).toEqual([
      2, 3,
    ]);
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

  it('keeps the rows outside an excluded set and reads the blank marker the same way', async () => {
    const harness = new EngineHarness(ORDER_COLUMNS, ORDERS);

    expect(
      await ids(harness, [{ kind: 'set', key: 'city', values: ['Moscow'], exclude: true }]),
    ).toEqual([2, 3, 5, 6]);

    expect(
      await ids(harness, [{ kind: 'set', key: 'city', values: ['Moscow', null], exclude: true }]),
    ).toEqual([2, 3, 6]);

    expect(
      await ids(harness, [{ kind: 'set', key: 'note', values: [null], exclude: true }]),
    ).toEqual([1, 4, 5, 6]);

    expect(
      await ids(harness, [{ kind: 'set', key: 'paid', values: [true], exclude: true }]),
    ).toEqual([2, 3, 5]);

    expect(
      await ids(harness, [{ kind: 'set', key: 'amount', values: [100, null], exclude: true }]),
    ).toEqual([2, 4, 5, 6]);

    expect(await ids(harness, [{ kind: 'set', key: 'city', values: [], exclude: true }])).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });

  it('lists only the values that hold the searched text, in any case and by the label of a value', async () => {
    const harness = new EngineHarness(ORDER_COLUMNS, ORDERS);

    expect(await harness.settle(harness.engine.distinct('note', { search: ' GIFT ' }))).toEqual({
      values: ['Gift', 'gift wrap'],
      truncated: false,
    });

    expect(
      await harness.settle(harness.engine.distinct('note', { search: 'gift', limit: 1 })),
    ).toEqual({ values: ['Gift'], truncated: true });

    expect(await harness.settle(harness.engine.distinct('city', { search: 'zzz' }))).toEqual({
      values: [],
      truncated: false,
    });

    expect(await harness.settle(harness.engine.distinct('note', { search: 'g.ft' }))).toEqual({
      values: [],
      truncated: false,
    });

    expect(await harness.settle(harness.engine.distinct('amount', { search: '0' }))).toEqual({
      values: [100, 120, 250, 300],
      truncated: false,
    });

    expect(
      await harness.settle(
        harness.engine.distinct('paid', {
          search: 'yes',
          text: (value) => (value === true ? 'Yes' : 'No'),
        }),
      ),
    ).toEqual({ values: [true], truncated: false });

    expect(
      await harness.settle(
        harness.engine.distinct('city', {
          search: 'capital',
          text: (value) => (value === 'Moscow' ? 'Capital' : String(value)),
        }),
      ),
    ).toEqual({ values: ['Moscow'], truncated: false });
  });

  it('lists the values found in a long column within the budget of one action', async () => {
    const harness = new EngineHarness(ACCOUNT_COLUMNS, accounts(ROWS));

    await harness.settle(harness.engine.distinct('email', { search: 'user4999' }));
    const started = performance.now();

    const found = await harness.settle(harness.engine.distinct('email', { search: 'user49999' }));

    expect(performance.now() - started).toBeLessThan(100);
    expect(found).toEqual({ values: ['User49999@Example.com'], truncated: false });
  });

  it('lists the first values of a long column of unique text within the budget of one action', async () => {
    const harness = new EngineHarness(ACCOUNT_COLUMNS, accounts(UNIQUE_ROWS));

    await harness.runToEnd({
      filters: [{ kind: 'set', key: 'email', values: ['User7@Example.com'] }],
    });

    const started = performance.now();
    const found = await harness.settle(harness.engine.distinct('email', { limit: 3 }));

    expect(performance.now() - started).toBeLessThan(100);

    expect(found).toEqual({
      values: ['User0@Example.com', 'User1@Example.com', 'User2@Example.com'],
      truncated: true,
    });
  });

  it('finds a rare value in a long sorted column of unique text within the budget of one action', async () => {
    const rows = accounts(SORTED_ROWS);
    const spent: number[] = [];
    const found: unknown[] = [];

    for (const seed of [7, 8]) {
      const rankHost = recordingRankHost((size) => shuffledOrder(size, seed));
      const harness = new EngineHarness(ACCOUNT_COLUMNS, rows, { rankHost });

      await harness.runToEnd({ sort: [{ key: 'email', direction: 'asc' }] });

      const started = performance.now();

      found.push(await harness.settle(harness.engine.distinct('email', { search: 'user499999@' })));
      spent.push(performance.now() - started);
    }

    expect(Math.min(spent[0] ?? 0, spent[1] ?? 0)).toBeLessThan(100);

    expect(found).toEqual([
      { values: ['User499999@Example.com'], truncated: false },
      { values: ['User499999@Example.com'], truncated: false },
    ]);
  });

  it('lists the first values of an unsorted column again without walking its values again', async () => {
    const harness = new EngineHarness(ACCOUNT_COLUMNS, accounts(ROWS), { sliceMs: 0 });

    await harness.settle(harness.engine.distinct('email', { limit: 3 }));
    const walked = harness.slices;

    const again = await harness.settle(harness.engine.distinct('email', { limit: 2 }));
    const searched = await harness.settle(harness.engine.distinct('email', { search: 'user1' }));

    expect(again).toEqual({
      values: ['User0@Example.com', 'User1@Example.com'],
      truncated: true,
    });

    expect(searched?.values.slice(0, 3)).toEqual([
      'User1@Example.com',
      'User10@Example.com',
      'User11@Example.com',
    ]);

    expect(harness.slices - walked).toBeLessThan(2 * PASS);

    const wider = await harness.settle(harness.engine.distinct('email', { limit: 5 }));

    expect(wider?.values).toHaveLength(5);
    expect(harness.slices - walked).toBeGreaterThanOrEqual(2 * PASS);
  });

  it('lists the same values from a column it has not sorted as from a sorted one', async () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const rows = notes(seed, 400);

      const fresh = await noteLists(rows, false);
      const ranked = await noteLists(rows, true);

      expect([fresh.kind, ranked.kind]).toEqual(['codes', 'string']);
      expect(fresh.found).toEqual(ranked.found);
    }
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
      values: ['Almaty', 'Kazan', null],
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
      values: ['Gift', 'gift wrap', 'urgent', null],
      truncated: true,
    });

    expect(await harness.settle(harness.engine.distinct('paid'))).toEqual({
      values: [false, true, null],
      truncated: false,
    });

    expect(await harness.settle(harness.engine.distinct('amount', { limit: 3 }))).toEqual({
      values: [75, 100, 120, null],
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
