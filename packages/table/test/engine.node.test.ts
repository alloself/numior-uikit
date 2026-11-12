import { describe, expect, it } from 'vite-plus/test';
import type { TableEngineColumn } from '../src/engine';
import { EngineHarness, PEOPLE, PEOPLE_COLUMNS, type Person } from './harness/engine';
import { recordingRankHost } from './harness/rank-host';

const many = (count: number): Person[] =>
  Array.from({ length: count }, (_, index) => ({
    name: `Имя ${count - index}`,
    age: (index * 7919) % 97,
    born: new Date(2000, 0, 1 + (index % 365)),
    active: index % 3 === 0,
  }));

describe('createTableEngine', () => {
  it('sorts by several keys with missing values last in both directions and reports phases', async () => {
    const harness = new EngineHarness(PEOPLE_COLUMNS, PEOPLE);

    expect(harness.visible('name')).toEqual(['Вера', 'анна', 'Борис', null, 'Анна']);

    const result = await harness.runToEnd({
      sort: [
        { key: 'age', direction: 'asc' },
        { key: 'name', direction: 'desc' },
      ],
    });

    expect(result).toEqual({ kind: 'done', count: 5, rows: 5 });
    expect(harness.visible('age')).toEqual([29, 29, 35, 41, null]);
    expect(harness.visible('name')).toEqual(['Борис', null, 'Анна', 'Вера', 'анна']);
    expect(harness.phases).toEqual(['keys', 'sort']);

    await harness.runToEnd({ sort: [{ key: 'born', direction: 'desc' }] });
    expect(harness.visible('name')).toEqual([null, 'анна', 'Анна', 'Вера', 'Борис']);

    await harness.runToEnd({ sort: [{ key: 'active', direction: 'asc' }] });
    expect(harness.visible('active')).toEqual([false, false, true, true, null]);
    expect(Array.from(harness.engine.visibleIndices())).toEqual([1, 4, 0, 3, 2]);
  });

  it('finds the positions of rows by their keys in the current order and stops at the limit', async () => {
    const harness = new EngineHarness(PEOPLE_COLUMNS, PEOPLE);
    const wanted = new Set<string | number>([0, 3]);

    expect(harness.engine.positionsOf((id) => wanted.has(id), 2)).toEqual([
      [0, 0],
      [3, 3],
    ]);

    await harness.runToEnd({ sort: [{ key: 'active', direction: 'asc' }] });

    expect(harness.engine.positionsOf((id) => wanted.has(id), 2)).toEqual([
      [0, 2],
      [3, 3],
    ]);

    expect(harness.engine.positionsOf(() => true, 2)).toEqual([
      [1, 0],
      [4, 1],
    ]);

    expect(harness.engine.positionsOf(() => false, 5)).toEqual([]);
  });

  it('runs a query synchronously through the same stages and supersedes a sliced run', async () => {
    const harness = new EngineHarness(PEOPLE_COLUMNS, PEOPLE);
    const pending = harness.run({ sort: [{ key: 'age', direction: 'asc' }] });
    const result = harness.engine.runSync({ sort: [{ key: 'name', direction: 'asc' }] });

    expect(result).toEqual({ kind: 'done', count: 5, rows: 5 });
    expect(harness.visible('name')).toEqual(['анна', 'Анна', 'Борис', 'Вера', null]);
    expect(await harness.settle(pending)).toEqual({ kind: 'cancelled' });
    expect(harness.visible('name')).toEqual(['анна', 'Анна', 'Борис', 'Вера', null]);
    expect(harness.engine.runSync({})).toEqual({ kind: 'done', count: 5, rows: 5 });
    expect(harness.visible('name')).toEqual(['Вера', 'анна', 'Борис', null, 'Анна']);
  });

  it('keeps built stores until the rows change and rejects unknown columns', async () => {
    const harness = new EngineHarness(PEOPLE_COLUMNS, PEOPLE);

    await harness.runToEnd({ sort: [{ key: 'age', direction: 'asc' }] });
    expect(harness.engine.store('age')?.kind).toBe('number');

    harness.progress.length = 0;
    await harness.runToEnd({ sort: [{ key: 'age', direction: 'desc' }] });
    expect(harness.phases).toEqual(['sort']);
    expect(harness.visible('age')).toEqual([41, 35, 29, 29, null]);

    harness.engine.setRows(PEOPLE.slice(0, 2));
    expect(harness.engine.store('age')).toBeUndefined();
    expect(harness.engine.count()).toBe(2);

    expect(harness.engine.nodeAt(1)).toEqual({
      kind: 'row',
      id: 1,
      index: 1,
      row: PEOPLE[1],
      level: 0,
      expandable: false,
      expanded: false,
      unloaded: false,
      loading: false,
    });

    expect(harness.engine.nodeAt(2)).toBeUndefined();

    await expect(harness.run({ sort: [{ key: 'height', direction: 'asc' }] })).rejects.toThrow(
      'Table engine has no column "height"',
    );
  });

  it('starts a sliced run over when a row is patched under it', async () => {
    const rows = many(20_000);
    const first = rows[0];
    const harness = new EngineHarness(PEOPLE_COLUMNS, rows, { sliceMs: 0 });
    const query = { sort: [{ key: 'age', direction: 'asc' as const }] };
    const pending = harness.run(query);

    await harness.step();

    if (first !== undefined) {
      rows[0] = { ...first, age: -5 };
    }

    harness.engine.patch(query, ['age']);

    expect(await harness.settle(pending)).toEqual({ kind: 'done', count: 20_000, rows: 20_000 });
    expect(harness.visible('age')[0]).toBe(-5);
    expect(harness.engine.runSync({ sort: [{ key: 'age', direction: 'desc' }] }).kind).toBe('done');
    expect(harness.visible('age').at(-1)).toBe(-5);
  });

  it('cancels the rank session of a text sort whose rows are replaced before the answer', async () => {
    const host = recordingRankHost();
    const harness = new EngineHarness(PEOPLE_COLUMNS, many(20_000), { sliceMs: 0, rankHost: host });
    const pending = harness.run({ sort: [{ key: 'name', direction: 'asc' }] });

    for (let turn = 0; turn < 50 && host.sessions[0]?.finished !== true; turn += 1) {
      await harness.step();
    }

    expect(host.sessions.map((session) => session.cancelled)).toEqual([false]);

    harness.engine.setRows(many(5));

    expect(host.sessions.map((session) => session.cancelled)).toEqual([true]);
    expect(await harness.settle(pending)).toEqual({ kind: 'cancelled' });
    expect(harness.engine.runSync({ sort: [{ key: 'name', direction: 'asc' }] }).kind).toBe('done');
    expect(harness.visible('name')).toEqual(['Имя 1', 'Имя 2', 'Имя 3', 'Имя 4', 'Имя 5']);
  });

  it('cancels through the signal, supersedes an older run and reports progress in slices', async () => {
    const harness = new EngineHarness(PEOPLE_COLUMNS, many(20_000), { sliceMs: 0 });
    const controller = new AbortController();
    const cancelled = harness.run({ sort: [{ key: 'name', direction: 'asc' }] }, controller.signal);

    await harness.step();
    expect(harness.pendingYields).toBe(1);

    controller.abort();
    expect(await harness.settle(cancelled)).toEqual({ kind: 'cancelled' });
    expect(harness.engine.store('name')).toBeUndefined();

    const first = harness.run({ sort: [{ key: 'age', direction: 'asc' }] });
    await harness.step();
    const second = harness.run({ sort: [{ key: 'age', direction: 'desc' }] });

    expect(await harness.settle(first)).toEqual({ kind: 'cancelled' });
    expect(await harness.settle(second)).toEqual({ kind: 'done', count: 20_000, rows: 20_000 });

    const ages = harness.visible('age');
    expect(ages[0]).toBe(96);
    expect(ages.at(-1)).toBe(0);

    expect(
      harness.progress.reduce((count, entry) => count + Number(entry.phase === 'sort'), 0),
    ).toBeGreaterThan(5);

    expect(harness.progress.at(-1)).toMatchObject({ phase: 'sort' });
  });

  it('prepares stores ahead and lets a run continue a store that is half built', async () => {
    const rows = many(10_000);
    let reads = 0;

    const columns: TableEngineColumn<Person>[] = [
      {
        kind: 'string',
        key: 'name',
        value: (row) => {
          reads += 1;
          return row.name;
        },
      },
      ...PEOPLE_COLUMNS.slice(1),
    ];

    const harness = new EngineHarness(columns, rows, { sliceMs: 0 });

    const preparing = harness.engine.prepare([
      { key: 'name', need: 'ranks' },
      { key: 'unknown', need: 'codes' },
    ]);

    expect(reads).toBeGreaterThan(0);
    expect(reads).toBeLessThan(rows.length);
    expect(harness.engine.store('name')).toBeUndefined();

    const sorted = harness.run({ sort: [{ key: 'name', direction: 'asc' }] });

    expect(await harness.settle(Promise.all([preparing, sorted]))).toMatchObject([
      true,
      { kind: 'done', rows: rows.length },
    ]);

    expect(reads).toBe(rows.length);
    expect(harness.engine.store('name')?.kind).toBe('string');
    expect(harness.visible('name').slice(0, 2)).toEqual(['Имя 1', 'Имя 2']);

    const stale = harness.engine.prepare([{ key: 'age', need: 'codes' }]);

    harness.engine.setRows(rows);

    expect(await harness.settle(stale)).toBe(false);
    expect(await harness.settle(harness.engine.prepare([]))).toBe(true);
  });
});
