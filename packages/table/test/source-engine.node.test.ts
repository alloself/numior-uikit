import { describe, expect, it } from 'vitest';
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
