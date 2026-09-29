import { describe, expect, it } from 'vitest';
import { EngineHarness, PEOPLE, PEOPLE_COLUMNS, type Person } from './harness/engine';

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
    });

    expect(harness.engine.nodeAt(2)).toBeUndefined();

    await expect(harness.run({ sort: [{ key: 'height', direction: 'asc' }] })).rejects.toThrow(
      'Table engine has no column "height"',
    );
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
    expect(harness.progress.filter((entry) => entry.phase === 'sort').length).toBeGreaterThan(5);
    expect(harness.progress.at(-1)).toMatchObject({ phase: 'sort' });
  });
});
