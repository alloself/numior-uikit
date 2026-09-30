import { describe, expect, it } from 'vitest';
import { buildSizeModel, indexAt, offsetAt, scrollTargetFor } from '../src/virtual/offsets';
import { VirtualHarness } from './harness/virtual';

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from }, (_, offset) => from + offset);

describe('useVirtualList', () => {
  it('renders the initial window before a measurement and a viewport window after mount', async () => {
    const unmeasured = VirtualHarness.mount({ height: 0, initialCount: 5 });
    await unmeasured.settle();
    expect(unmeasured.renderedIndices).toEqual(range(0, 5));
    expect(unmeasured.viewport).toBe(0);
    unmeasured.unmount();
    const list = VirtualHarness.mount({ height: 200, itemSize: 20, overscan: 2 });
    await list.settle();
    expect(list.viewport).toBe(200);
    expect(list.range).toEqual({ start: 0, end: 13 });
    expect(list.renderedIndices).toEqual(range(0, 13));
    expect(list.totalSize).toBe(20_000);
    expect(list.spacers).toEqual({ start: 0, end: 20_000 - 13 * 20 });
    expect(list.rowTransform(3)).toBe('translateY(60px)');
    await list.scroll(5000);
    expect(list.scrollTop).toBe(5000);
    expect(list.range).toEqual({ start: 248, end: 263 });
    expect(list.spacers).toEqual({ start: 248 * 20, end: 20_000 - 263 * 20 });
    await list.scroll(1_000_000);
    expect(list.range).toEqual({ start: 997, end: 1000 });
    expect(list.spacers.end).toBe(0);
    list.unmount();
  });

  it('measures variable sizes through prefix sums', async () => {
    const list = VirtualHarness.mount({
      count: 6,
      itemSize: (index) => 20 + (index % 3) * 10,
      height: 100,
      overscan: 0,
    });

    await list.settle();
    expect(list.totalSize).toBe(180);
    expect(list.offsetOf(3)).toBe(90);
    expect(list.offsetOf(6)).toBe(180);
    expect(list.renderedIndices).toEqual(range(0, 4));
    await list.scroll(50);
    expect(list.range).toEqual({ start: 2, end: 6 });
    expect(list.rowTransform(4)).toBe('translateY(110px)');
    list.unmount();
  });

  it('scrolls an index into view with each alignment and skips visible rows on auto', async () => {
    const list = VirtualHarness.mount({ height: 200, itemSize: 20 });
    await list.settle();
    await list.scrollToIndex(50, 'start');
    expect(list.scrollTop).toBe(1000);
    expect(list.renderedIndices).toContain(50);
    await list.scrollToIndex(50, 'end');
    expect(list.scrollTop).toBe(820);
    await list.scrollToIndex(50, 'center');
    expect(list.scrollTop).toBe(910);
    await list.scrollToIndex(50, 'start');
    await list.scrollToIndex(55, 'auto');
    expect(list.scrollTop).toBe(1000);
    await list.scrollToIndex(60, 'auto');
    expect(list.scrollTop).toBe(1020);
    await list.scrollToIndex(10, 'auto');
    expect(list.scrollTop).toBe(200);
    await list.scrollToIndex(999, 'start');
    expect(list.scrollTop).toBe(19_800);
    list.unmount();
  });

  it('keeps a pinned index rendered outside the window without duplicating it inside', async () => {
    const list = VirtualHarness.mount({ height: 200, itemSize: 20, overscan: 2 });
    await list.settle();
    await list.pin(500);
    expect(list.renderedIndices).toEqual([...range(0, 13), 500]);
    expect(list.rowTransform(500)).toBe('translateY(10000px)');
    await list.scroll(20_000);
    expect(list.renderedIndices).toEqual([500, ...range(997, 1000)]);
    await list.pin(5);
    await list.scroll(0);
    expect(list.renderedIndices).toEqual(range(0, 13));
    await list.pin(5000);
    expect(list.renderedIndices).toEqual(range(0, 13));
    list.unmount();
  });

  it('keeps a slot on every row that stays in the window and hands freed slots to newcomers', async () => {
    const list = VirtualHarness.mount({ height: 200, itemSize: 20, overscan: 2 });
    await list.settle();
    expect([...list.slots.entries()]).toEqual(range(0, 13).map((index) => [index, index]));
    await list.scroll(100);
    expect(list.range).toEqual({ start: 3, end: 18 });
    for (const index of range(3, 13)) {
      expect(list.slots.get(index)).toBe(index);
    }
    expect(range(13, 18).map((index) => list.slots.get(index))).toEqual([0, 1, 2, 13, 14]);
    expect(new Set(list.slots.values()).size).toBe(15);
    await list.scroll(20_000);
    expect(Math.max(...list.slots.values())).toBeLessThan(15);
    await list.scroll(100);
    expect(new Set(list.slots.values()).size).toBe(15);
    list.unmount();
  });

  it('holds the slot of a pinned index while it stays rendered outside the window', async () => {
    const list = VirtualHarness.mount({ height: 200, itemSize: 20, overscan: 2 });
    await list.settle();
    await list.pin(500);
    expect(list.slots.get(500)).toBe(13);
    await list.scroll(20_000);
    expect(list.renderedIndices).toEqual([500, ...range(997, 1000)]);
    expect(list.slots.get(500)).toBe(13);
    expect(range(997, 1000).map((index) => list.slots.get(index))).toEqual([0, 1, 2]);
    await list.scrollToIndex(500, 'start');
    expect(list.slots.get(500)).toBe(13);
    list.unmount();
  });

  it('leaves the scroll event to the host when listen is off and still measures on demand', async () => {
    const list = VirtualHarness.mount({ height: 200, itemSize: 20, overscan: 2, listen: false });
    await list.settle();
    expect(list.range).toEqual({ start: 0, end: 13 });
    await list.scroll(5000);
    expect(list.range).toEqual({ start: 0, end: 13 });
    await list.measure();
    expect(list.range).toEqual({ start: 248, end: 263 });
    list.unmount();
  });

  it('reports the offset of the first rendered row relative to the viewport', async () => {
    const list = VirtualHarness.mount({ height: 200, itemSize: 20, overscan: 2 });
    await list.settle();
    expect(list.windowOffset).toBe(0);
    await list.scroll(5000);
    expect(list.range.start).toBe(248);
    expect(list.windowOffset).toBe(248 * 20 - 5000);
    await list.scroll(15);
    expect(list.windowOffset).toBe(-15);
    list.unmount();
  });

  it('shrinks the window when the count or the viewport shrinks and renders everything when disabled', async () => {
    const list = VirtualHarness.mount({ height: 200, itemSize: 20, overscan: 2 });
    await list.settle();
    await list.setCount(5);
    expect(list.range).toEqual({ start: 0, end: 5 });
    expect(list.totalSize).toBe(100);
    expect(list.spacers).toEqual({ start: 0, end: 0 });
    await list.setCount(1000);
    await list.resize(60);
    expect(list.range).toEqual({ start: 0, end: 6 });
    list.unmount();

    const plain = VirtualHarness.mount({
      count: 30,
      height: 200,
      itemSize: 20,
      enabled: false,
    });

    await plain.settle();
    expect(plain.renderedIndices).toEqual(range(0, 30));
    await plain.scroll(500);
    expect(plain.renderedIndices).toEqual(range(0, 30));
    plain.unmount();
  });
});

describe('virtual offsets', () => {
  it('locates indices by position in fixed and variable models', () => {
    const fixed = buildSizeModel(10, 25);
    expect(indexAt(fixed, 0)).toBe(0);
    expect(indexAt(fixed, 49)).toBe(1);
    expect(indexAt(fixed, 50)).toBe(2);
    expect(indexAt(fixed, 10_000)).toBe(9);
    expect(offsetAt(fixed, 10)).toBe(250);
    const variable = buildSizeModel(4, (index) => [10, 20, 30, 40][index] ?? 0);
    expect(indexAt(variable, 9)).toBe(0);
    expect(indexAt(variable, 10)).toBe(1);
    expect(indexAt(variable, 59)).toBe(2);
    expect(indexAt(variable, 60)).toBe(3);
    expect(indexAt(variable, 500)).toBe(3);
    expect(offsetAt(variable, 2)).toBe(30);
    expect(indexAt(buildSizeModel(0, 20), 40)).toBe(0);
  });

  it('computes scroll targets clamped to the scrollable extent', () => {
    const model = buildSizeModel(100, 10);
    expect(scrollTargetFor(model, 50, 0, 100, 'start')).toBe(500);
    expect(scrollTargetFor(model, 50, 0, 100, 'end')).toBe(410);
    expect(scrollTargetFor(model, 50, 0, 100, 'center')).toBe(455);
    expect(scrollTargetFor(model, 5, 0, 100, 'auto')).toBeUndefined();
    expect(scrollTargetFor(model, 12, 0, 100, 'auto')).toBe(30);
    expect(scrollTargetFor(model, 2, 500, 100, 'auto')).toBe(20);
    expect(scrollTargetFor(model, 99, 0, 100, 'start')).toBe(900);
  });
});
