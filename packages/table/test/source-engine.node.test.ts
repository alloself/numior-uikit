import { describe, expect, it } from 'vite-plus/test';
import { SourceHarness } from './harness/source';

describe('createSourceEngine', () => {
  it('loads the blocks of a window in one request each and serves rows from them', async () => {
    const harness = new SourceHarness({ total: 1000 });

    harness.engine.ensure(0, 30);
    expect(harness.requests).toEqual([{ offset: 0, limit: 100, sort: [] }]);
    expect(harness.engine.settled()).toBe(false);
    expect(harness.engine.pendingAt(5)).toBe(true);

    await harness.answer(0);
    expect(harness.engine.settled()).toBe(true);
    expect(harness.engine.count()).toBe(1000);
    expect(harness.engine.nodeAt(5)).toMatchObject({ kind: 'row', id: 5, row: { id: 5 } });
    expect(harness.engine.pendingAt(150)).toBe(true);

    harness.engine.ensure(150, 260);
    expect(harness.requests.at(-1)).toEqual({ offset: 100, limit: 200, sort: [] });

    await harness.answer(1);
    expect(harness.ids(255, 258)).toEqual([255, 256, 257]);
    expect(Array.from(harness.engine.visibleIndices()).length).toBe(300);
  });

  it('drops stale answers and aborts requests when the query changes, keeping the total', async () => {
    const harness = new SourceHarness({ total: 1000 });

    harness.engine.ensure(0, 30);
    await harness.answer(0);
    harness.engine.ensure(500, 530);

    const run = harness.engine.run({ sort: [{ key: 'id', direction: 'desc' }] });

    expect(harness.aborted(1)).toBe(true);

    expect(harness.requests.at(-1)).toEqual({
      offset: 500,
      limit: 100,
      sort: [{ key: 'id', direction: 'desc' }],
    });

    expect(harness.engine.pendingAt(10)).toBe(true);
    expect(harness.engine.count()).toBe(1000);
    expect(harness.engine.settled()).toBe(true);

    await harness.answer(1);
    expect(harness.engine.pendingAt(520)).toBe(true);

    await harness.answer(2);
    await expect(run).resolves.toEqual({ kind: 'done', count: 1000, rows: 1000 });
    expect(harness.ids(520, 522)).toEqual([520, 521]);
  });

  it('keeps two requests in flight and fills the current window after each answer', async () => {
    const harness = new SourceHarness({ total: 10_000 });

    harness.engine.ensure(0, 10);
    harness.engine.ensure(1000, 1010);
    harness.engine.ensure(2000, 2010);
    expect(harness.requests.map((request) => request.offset)).toEqual([0, 1000]);

    await harness.answer(0);
    expect(harness.requests.map((request) => request.offset)).toEqual([0, 1000, 2000]);
  });

  it('grows the count by a block while more rows follow and fixes it at the last block', async () => {
    const harness = new SourceHarness({ blockSize: 50 });

    harness.engine.ensure(0, 20);
    expect(harness.engine.count()).toBe(50);

    await harness.answer(0, { hasMore: true });
    expect(harness.engine.count()).toBe(100);

    harness.engine.ensure(60, 80);

    await harness.answer(1, {
      rows: Array.from({ length: 12 }, (_, index) => ({ id: 50 + index })),
    });

    expect(harness.engine.count()).toBe(62);

    harness.engine.ensure(40, 90);
    expect(harness.requests).toHaveLength(2);
  });

  it('forgets the least recently used blocks and refetches them on demand', async () => {
    const harness = new SourceHarness({ total: 1000, cacheBlocks: 2 });

    harness.engine.ensure(0, 10);
    await harness.answer(0);
    harness.engine.ensure(100, 110);
    await harness.answer(1);
    harness.engine.ensure(0, 10);
    harness.engine.ensure(200, 210);
    await harness.answer(2);
    expect(harness.engine.pendingAt(150)).toBe(true);
    expect(harness.engine.pendingAt(5)).toBe(false);

    harness.engine.refresh();
    expect(harness.engine.pendingAt(205)).toBe(true);
    expect(harness.requests.at(-1)).toEqual({ offset: 200, limit: 100, sort: [] });
  });

  it('keeps totals through a sort change and asks for them again on refresh', async () => {
    const harness = new SourceHarness({ total: 10, totals: { amount: 7 } });

    harness.engine.ensure(0, 10);

    const run = harness.engine.run({ totals: true });

    void harness.engine.run({ sort: [{ key: 'id', direction: 'desc' }] });
    await harness.answer(0);
    await harness.answer(1);
    await run;
    expect(harness.engine.totals()).toEqual({ amount: 7 });

    const before = harness.changes;

    harness.engine.refresh();
    await harness.answer(2);
    expect(harness.changes).toBeGreaterThan(before + 1);
    expect(harness.engine.totals()).toEqual({ amount: 7 });
  });

  it('asks the source for totals and values and reports failed requests', async () => {
    const harness = new SourceHarness({
      total: 10,
      totals: { amount: 42 },
      values: { values: ['Москва'], truncated: false },
    });

    harness.engine.ensure(0, 10);

    const run = harness.engine.run({ totals: true });

    await harness.answer(0);
    await run;
    expect(harness.engine.totals()).toEqual({ amount: 42 });

    await expect(harness.engine.distinct('city')).resolves.toEqual({
      values: ['Москва'],
      truncated: false,
    });

    const failing = harness.engine.run({ filters: [{ kind: 'quick', value: 'x' }] });

    await harness.fail(1, new Error('offline'));
    await expect(failing).resolves.toEqual({ kind: 'done', count: 10, rows: 10 });
    expect(harness.errors).toEqual([new Error('offline')]);
    expect(harness.changes).toBeGreaterThan(0);
  });
});

describe('createSourceEngine with groups', () => {
  it('asks for the groups of the first level and holds one row per group', async () => {
    const harness = new SourceHarness({ total: 90 });
    const run = harness.engine.run({ groupBy: ['team'] });

    harness.engine.ensure(0, 30);
    expect(harness.paths).toEqual([{ offset: 0, groupBy: ['team'], groupPath: [] }]);

    await harness.answerLevel(0);
    await expect(run).resolves.toEqual({ kind: 'done', count: 3, rows: 90 });
    expect(harness.labels(0, 4)).toEqual(['team=0 (30)', 'team=1 (30)', 'team=2 (30)', 'none']);

    expect(harness.engine.nodeAt(1)).toEqual({
      kind: 'group',
      id: '[1]',
      key: 'team',
      value: 1,
      path: [1],
      level: 0,
      count: 30,
      expanded: false,
      aggregates: { id: 30 },
    });
  });

  it('opens a group over skeleton rows of its count and loads them by the group path', async () => {
    const harness = new SourceHarness({ total: 90 });

    void harness.engine.run({ groupBy: ['team'] });
    harness.engine.ensure(0, 30);
    await harness.answerLevel(0);
    harness.engine.setToggled(['[1]']);
    expect(harness.engine.count()).toBe(33);
    expect(harness.labels(0, 4)).toEqual(['team=0 (30)', 'team=1 (30)', 'pending', 'pending']);
    expect(harness.engine.nodeAt(1)).toMatchObject({ expanded: true });
    expect(harness.paths.at(-1)).toEqual({ offset: 0, groupBy: ['team'], groupPath: [1] });

    await harness.answerLevel(1);
    expect(harness.labels(2, 4)).toEqual(['row 1', 'row 4']);
    expect(harness.engine.nodeAt(2)).toMatchObject({ kind: 'row', id: 1, level: 1 });
    expect(harness.labels(31, 33)).toEqual(['row 88', 'team=2 (30)']);

    expect(Array.from(harness.engine.visibleIndices())).toEqual(
      Array.from({ length: 30 }, (_, offset) => 2 + offset),
    );
  });

  it('closes a group and opens it again from the cache without a request', async () => {
    const harness = new SourceHarness({ total: 90 });

    void harness.engine.run({ groupBy: ['team'] });
    harness.engine.ensure(0, 30);
    await harness.answerLevel(0);
    harness.engine.setToggled(['[0]']);
    await harness.answerLevel(1);
    harness.engine.setToggled([]);
    expect(harness.engine.count()).toBe(3);
    expect(harness.labels(0, 3)).toEqual(['team=0 (30)', 'team=1 (30)', 'team=2 (30)']);

    harness.engine.setToggled(['[0]']);
    expect(harness.paths).toHaveLength(2);
    expect(harness.labels(0, 3)).toEqual(['team=0 (30)', 'row 0', 'row 3']);
  });

  it('walks nested levels: one placeholder until the inner groups arrive', async () => {
    const harness = new SourceHarness({ total: 90 });

    void harness.engine.run({ groupBy: ['team', 'parity'] });
    harness.engine.ensure(0, 30);
    await harness.answerLevel(0);
    harness.engine.setToggled(['[2]']);
    expect(harness.engine.count()).toBe(4);
    expect(harness.labels(2, 4)).toEqual(['team=2 (30)', 'pending']);

    expect(harness.paths.at(-1)).toEqual({
      offset: 0,
      groupBy: ['team', 'parity'],
      groupPath: [2],
    });

    await harness.answerLevel(1);
    expect(harness.labels(2, 5)).toEqual(['team=2 (30)', 'parity=0 (15)', 'parity=1 (15)']);
    expect(harness.engine.nodeAt(3)).toMatchObject({ id: '[2,0]', key: 'parity', level: 1 });

    harness.engine.setToggled(['[2]', '[2,1]']);
    expect(harness.engine.count()).toBe(20);
    expect(harness.paths.at(-1)?.groupPath).toEqual([2, 1]);

    await harness.answerLevel(2);
    expect(harness.labels(4, 7)).toEqual(['parity=1 (15)', 'row 5', 'row 11']);
    expect(harness.engine.nodeAt(5)).toMatchObject({ level: 2 });
  });

  it('opens the expanded groups again after the query changes', async () => {
    const harness = new SourceHarness({ total: 90 });

    void harness.engine.run({ groupBy: ['team'] });
    harness.engine.ensure(0, 30);
    await harness.answerLevel(0);
    harness.engine.setToggled(['[1]']);
    await harness.answerLevel(1);
    void harness.engine.run({ groupBy: ['team'], sort: [{ key: 'id', direction: 'desc' }] });
    expect(harness.engine.count()).toBe(3);
    expect(harness.labels(0, 2)).toEqual(['pending', 'pending']);

    await harness.answerLevel(2);
    expect(harness.engine.count()).toBe(33);
    expect(harness.paths.at(-1)?.groupPath).toEqual([1]);

    void harness.engine.run({ sort: [{ key: 'id', direction: 'desc' }] });
    expect(harness.paths.at(-1)).toEqual({ offset: 0, groupBy: [], groupPath: [] });
  });

  it('ends a group at a short block when its count promised more rows', async () => {
    const harness = new SourceHarness({ total: 90 });

    void harness.engine.run({ groupBy: ['team'] });
    harness.engine.ensure(0, 30);
    await harness.answerLevel(0);
    harness.engine.setToggled(['[0]']);
    expect(harness.engine.count()).toBe(33);

    await harness.answerLevel(1, 60);
    expect(harness.engine.count()).toBe(23);
    expect(harness.labels(20, 23)).toEqual(['row 57', 'team=1 (30)', 'team=2 (30)']);
  });

  it('reports a source that answers a group level with rows', async () => {
    const harness = new SourceHarness({ total: 90 });

    void harness.engine.run({ groupBy: ['team'] });
    harness.engine.ensure(0, 30);
    await harness.answer(0);
    expect(harness.errors).toHaveLength(1);
    expect(harness.engine.pendingAt(0)).toBe(true);
  });
});

describe('createSourceEngine with tree rows', () => {
  it('marks rows with children expandable and loads them from the source when a row opens', async () => {
    const harness = new SourceHarness({ total: 30, tree: true });

    harness.engine.ensure(0, 30);
    await harness.answer(0);
    expect(harness.engine.nodeAt(0)).toMatchObject({ expandable: true, expanded: false });
    expect(harness.engine.nodeAt(1)).toMatchObject({ expandable: false });

    harness.engine.setToggled([0]);
    expect(harness.engine.count()).toBe(31);
    expect(harness.labels(0, 3)).toEqual(['row 0', 'pending', 'row 1']);
    expect(harness.engine.nodeAt(0)).toMatchObject({ expanded: true, loading: true });
    expect(harness.parents).toEqual([0]);

    await harness.answerChildren(0, [100, 101, 102]);
    expect(harness.engine.count()).toBe(33);
    expect(harness.labels(0, 5)).toEqual(['row 0', 'row 100', 'row 101', 'row 102', 'row 1']);
    expect(harness.engine.nodeAt(1)).toMatchObject({ level: 1, expandable: true });
    expect(harness.engine.nodeAt(0)).toMatchObject({ loading: false });
  });

  it('opens nested rows and keeps a closed branch for the next opening', async () => {
    const harness = new SourceHarness({ total: 30, tree: true });

    harness.engine.ensure(0, 30);
    await harness.answer(0);
    harness.engine.setToggled([0, 100]);
    await harness.answerChildren(0, [100, 101]);
    expect(harness.parents).toEqual([0, 100]);

    await harness.answerChildren(1, [1000]);
    expect(harness.labels(0, 5)).toEqual(['row 0', 'row 100', 'row 1000', 'row 101', 'row 1']);
    expect(harness.engine.nodeAt(2)).toMatchObject({ level: 2 });

    harness.engine.toggle(0);
    expect(harness.engine.count()).toBe(30);

    harness.engine.toggle(0);
    expect(harness.parents).toHaveLength(2);
    expect(harness.engine.count()).toBe(33);
  });

  it('asks for the children again after the query changes and after a failure', async () => {
    const harness = new SourceHarness({ total: 30, tree: true });

    harness.engine.ensure(0, 30);
    await harness.answer(0);
    harness.engine.setToggled([10]);
    await harness.failChildren(0, new Error('offline'));
    expect(harness.errors).toEqual([new Error('offline')]);
    expect(harness.labels(10, 12)).toEqual(['row 10', 'pending']);

    void harness.engine.run({ sort: [{ key: 'id', direction: 'desc' }] });
    await harness.answer(1);
    expect(harness.parents).toEqual([10, 10]);

    await harness.answerChildren(1, [200]);
    expect(harness.labels(10, 13)).toEqual(['row 10', 'row 200', 'row 11']);
  });
});

describe('createSourceEngine with detail rows', () => {
  it('opens a detail under a loaded row without asking the source', async () => {
    const harness = new SourceHarness({ total: 30, details: true });

    harness.engine.ensure(0, 30);
    await harness.answer(0);
    expect(harness.engine.nodeAt(5)).toMatchObject({ expandable: true, expanded: false });
    expect(harness.engine.nodeAt(3)).toMatchObject({ expandable: false });

    harness.engine.setToggled([5, 3]);
    expect(harness.engine.count()).toBe(31);
    expect(harness.engine.rowCount()).toBe(30);
    expect(harness.engine.details()).toEqual([6]);
    expect(harness.engine.nodeAt(5)).toMatchObject({ expanded: true, loading: false });
    expect(harness.engine.nodeAt(6)).toEqual({ kind: 'detail', id: 5, row: { id: 5 }, level: 1 });
    expect(harness.engine.pendingAt(6)).toBe(false);
    expect(harness.labels(5, 8)).toEqual(['row 5', 'detail 5', 'row 6']);
    expect(harness.requests).toHaveLength(1);

    harness.engine.toggle(6);
    expect(harness.engine.count()).toBe(31);

    harness.engine.toggle(5);
    expect(harness.engine.count()).toBe(30);
  });

  it('opens details inside a server group one level deeper than its rows', async () => {
    const harness = new SourceHarness({ total: 90, details: true });

    void harness.engine.run({ groupBy: ['team'] });
    harness.engine.ensure(0, 30);
    await harness.answerLevel(0);
    harness.engine.setToggled(['[1]', 4]);
    await harness.answerLevel(1);
    expect(harness.labels(1, 4)).toEqual(['team=1 (30)', 'row 1', 'row 4']);
    expect(harness.engine.nodeAt(4)).toMatchObject({ kind: 'detail', id: 4, level: 2 });
    expect(harness.engine.details()).toEqual([4]);
    expect(harness.engine.count()).toBe(34);
  });
});
