import { describe, expect, it } from 'vite-plus/test';
import { buildSizeModel, indexAt, offsetAt, scrollTargetFor } from '../src/virtual/offsets';
import { createSizeIndex } from '../src/virtual/size-index';
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
    expect(list.indexAt(89)).toBe(2);
    expect(list.indexAt(90)).toBe(3);
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

  it('keeps frozen rows rendered and windows the rest below them', async () => {
    const list = VirtualHarness.mount({ height: 200, itemSize: 20, overscan: 2, frozen: 2 });

    await list.settle();
    expect(list.range).toEqual({ start: 2, end: 13 });
    expect(list.renderedIndices).toEqual(range(0, 13));
    expect(list.frame).toEqual({ lead: 0, rest: 19_740, clampStart: -60, clampEnd: -60 });

    await list.scroll(5000);
    expect(list.range).toEqual({ start: 250, end: 263 });
    expect(list.renderedIndices).toEqual([0, 1, ...range(250, 263)]);
    expect(list.frame).toEqual({ lead: 4960, rest: 14_740, clampStart: -100, clampEnd: -100 });

    await list.pin(1);
    expect(list.renderedIndices).toEqual([0, 1, ...range(250, 263)]);

    await list.pin(100);
    expect(list.renderedIndices).toEqual([0, 1, 100, ...range(250, 263)]);
    expect(list.frame).toEqual({ lead: 4940, rest: 14_740, clampStart: -120, clampEnd: -100 });

    await list.pin(undefined);
    await list.freeze(0);
    expect(list.range).toEqual({ start: 248, end: 263 });
    expect(list.renderedIndices).toEqual(range(248, 263));

    list.unmount();
  });

  it('scrolls a row to the edge of the frozen rows and leaves frozen rows where they are', async () => {
    const list = VirtualHarness.mount({ height: 200, itemSize: 20, frozen: 2 });

    await list.settle();
    await list.scrollToIndex(50, 'start');
    expect(list.scrollTop).toBe(960);

    await list.scrollToIndex(50, 'end');
    expect(list.scrollTop).toBe(820);

    await list.scrollToIndex(50, 'center');
    expect(list.scrollTop).toBe(890);

    await list.scrollToIndex(50, 'start');
    await list.scrollToIndex(49, 'auto');
    expect(list.scrollTop).toBe(940);

    await list.scrollToIndex(56, 'auto');
    expect(list.scrollTop).toBe(940);

    await list.scrollToIndex(57, 'auto');
    expect(list.scrollTop).toBe(960);

    await list.scrollToIndex(1, 'start');
    expect(list.scrollTop).toBe(960);

    await list.scrollToIndex(2, 'auto');
    expect(list.scrollTop).toBe(0);

    list.unmount();
  });

  it('renders frozen rows before a measurement, past the count and not at all when disabled', async () => {
    const unmeasured = VirtualHarness.mount({ height: 0, initialCount: 5, frozen: 7 });

    await unmeasured.settle();
    expect(unmeasured.renderedIndices).toEqual(range(0, 7));
    expect(unmeasured.range).toEqual({ start: 7, end: 7 });

    unmeasured.unmount();

    const short = VirtualHarness.mount({ count: 3, height: 200, itemSize: 20, frozen: 10 });

    await short.settle();
    expect(short.renderedIndices).toEqual(range(0, 3));
    expect(short.range).toEqual({ start: 3, end: 3 });

    await short.scrollToIndex(2, 'start');
    expect(short.scrollTop).toBe(0);

    short.unmount();

    const plain = VirtualHarness.mount({
      count: 30,
      height: 200,
      itemSize: 20,
      enabled: false,
      frozen: 2,
    });

    await plain.settle();
    expect(plain.range).toEqual({ start: 0, end: 30 });
    expect(plain.renderedIndices).toEqual(range(0, 30));

    plain.unmount();
  });

  it('keeps the first row under the frozen rows in place when sizes change', async () => {
    const sizes = createSizeIndex(1000, 20);
    const list = VirtualHarness.mount({ height: 200, itemSize: sizes, overscan: 2, frozen: 2 });

    await list.settle();
    await list.scroll(5000);
    expect(list.range).toEqual({ start: 250, end: 263 });
    expect(await list.resizeRows([[100, 50]])).toBe(true);
    expect(list.scrollTop).toBe(5030);
    expect(list.range).toEqual({ start: 250, end: 263 });
    expect(await list.resizeRows([[0, 50]])).toBe(true);
    expect(list.scrollTop).toBe(5030);
    expect(list.elementScroll).toBe(5030);
    expect(list.range).toEqual({ start: 250, end: 261 });
    expect(list.frame.lead).toBe(4990);

    await list.setItemSize(createSizeIndex(1000, 20));
    expect(list.scrollTop).toBe(5000);
    expect(list.range).toEqual({ start: 250, end: 263 });

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

  it('moves both edges of a fixed-size window at the same scroll offset', async () => {
    const list = VirtualHarness.mount({ height: 210, itemSize: 20, overscan: 2 });
    await list.settle();
    expect(list.range).toEqual({ start: 0, end: 14 });

    await list.scroll(100);
    expect(list.range).toEqual({ start: 3, end: 19 });

    const settled = list.range;

    await list.scroll(110);
    expect(list.range).toBe(settled);

    await list.scroll(119);
    expect(list.range).toBe(settled);

    await list.scroll(120);
    expect(list.range).toEqual({ start: 4, end: 20 });

    list.unmount();
  });

  it('frames the window between two spacers and clamps it to the rendered rows', async () => {
    const list = VirtualHarness.mount({ height: 200, itemSize: 20, overscan: 2 });
    await list.settle();
    expect(list.frame).toEqual({ lead: 0, rest: 19_740, clampStart: -60, clampEnd: -60 });
    expect(list.spacerStyles).toEqual({ lead: '0px', rest: '19740px' });
    expect(list.clampStyles).toEqual({ start: '-60px', end: '-60px' });

    await list.scroll(5000);
    expect(list.frame).toEqual({ lead: 4960, rest: 14_740, clampStart: -100, clampEnd: -100 });

    const settled = list.frame;

    await list.scroll(5005);
    expect(list.frame).toBe(settled);

    await list.pin(900);
    expect(list.renderedIndices.at(-1)).toBe(900);
    expect(list.frame).toEqual({ lead: 4960, rest: 14_720, clampStart: -100, clampEnd: -120 });

    await list.pin(3);
    expect(list.renderedIndices[0]).toBe(3);
    expect(list.frame).toEqual({ lead: 4940, rest: 14_740, clampStart: -120, clampEnd: -100 });

    list.unmount();
  });

  it('grows a spacer before the render and shrinks the other one with it', async () => {
    const list = VirtualHarness.mount({ height: 200, itemSize: 20, overscan: 2 });
    await list.settle();
    await list.scroll(5000);
    expect(list.spacerStylesAtRender).toEqual({ lead: '4960px', rest: '19740px' });
    expect(list.spacerStyles).toEqual({ lead: '4960px', rest: '14740px' });

    await list.scroll(1000);
    expect(list.spacerStylesAtRender).toEqual({ lead: '4960px', rest: '18740px' });
    expect(list.spacerStyles).toEqual({ lead: '960px', rest: '18740px' });

    list.unmount();
  });

  it('takes measured sizes and keeps the first visible row in place', async () => {
    const sizes = createSizeIndex(1000, 20);
    const list = VirtualHarness.mount({ height: 200, itemSize: sizes, overscan: 2 });

    await list.settle();
    await list.scroll(5000);
    expect(list.range).toEqual({ start: 248, end: 263 });
    expect(await list.resizeRows([[100, 50]])).toBe(true);
    expect(list.scrollTop).toBe(5030);
    expect(list.elementScroll).toBe(5030);
    expect(list.range).toEqual({ start: 248, end: 263 });
    expect(list.frame.lead).toBe(4990);
    expect(await list.resizeRows([[400, 50]])).toBe(true);
    expect(list.scrollTop).toBe(5030);
    expect(list.totalSize).toBe(20_060);
    expect(await list.resizeRows([[250, 60]])).toBe(true);
    expect(list.scrollTop).toBe(5030);
    expect(await list.resizeRows([[250, 60]])).toBe(false);

    await list.scroll(5050);
    expect(await list.resizeRows([[250, 30]])).toBe(true);
    expect(list.scrollTop).toBe(5050);

    list.unmount();
  });

  it('stays at the end when rows measured there turn out taller', async () => {
    const sizes = createSizeIndex(1000, 20);
    const list = VirtualHarness.mount({ height: 200, itemSize: sizes, overscan: 2 });

    await list.settle();
    await list.scroll(19_800);
    expect(await list.resizeRows([[995, 50]])).toBe(true);
    expect(list.scrollTop).toBe(19_830);
    expect(list.elementScroll).toBe(19_830);

    await list.scroll(19_700);
    expect(await list.resizeRows([[996, 50]])).toBe(true);
    expect(list.scrollTop).toBe(19_700);

    list.unmount();
  });

  it('keeps the same row on top when the size index is replaced', async () => {
    const measured = createSizeIndex(1000, 20, [[5, 100]]);
    const list = VirtualHarness.mount({ height: 200, itemSize: measured, overscan: 2 });

    await list.settle();
    await list.scroll(1010);
    expect(list.range).toEqual({ start: 44, end: 59 });

    await list.setItemSize(createSizeIndex(1000, 20));

    expect(list.scrollTop).toBe(930);
    expect(list.elementScroll).toBe(930);
    expect(list.range).toEqual({ start: 44, end: 59 });

    await list.setItemSize(20);
    expect(list.scrollTop).toBe(930);

    await list.setItemSize(createSizeIndex(1000, 20, [[10, 60]]));
    expect(list.scrollTop).toBe(970);
    expect(list.range).toEqual({ start: 44, end: 59 });

    list.unmount();
  });

  it('ignores measured sizes while the rows have one fixed size', async () => {
    const list = VirtualHarness.mount({ height: 200, itemSize: 20 });

    await list.settle();
    await list.scroll(5000);
    expect(await list.resizeRows([[100, 50]])).toBe(false);
    expect(list.scrollTop).toBe(5000);

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

  it('shows the start of an item taller than the viewport when it scrolls into view', () => {
    const model = buildSizeModel(4, (index) => [10, 300, 30, 40][index] ?? 0);

    expect(scrollTargetFor(model, 1, 0, 100, 'auto')).toBe(10);
    expect(scrollTargetFor(model, 2, 0, 100, 'auto')).toBe(240);
    expect(scrollTargetFor(model, 1, 200, 100, 'auto')).toBe(10);
  });
});
