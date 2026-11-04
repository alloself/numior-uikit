import { describe, expect, it } from 'vite-plus/test';
import { createSizeIndex } from '../src';
import { canvasScaleFor } from '../src/virtual/offsets';
import { VirtualHarness } from './harness/virtual';

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from }, (_, offset) => from + offset);

describe('useVirtualList on the x axis, under a canvas ceiling and with measured sizes', () => {
  it('windows columns from the inline scroll position and mirrors it in RTL', async () => {
    const columns = VirtualHarness.mount({
      axis: 'x',
      count: 200,
      itemSize: 100,
      height: 500,
      overscan: 1,
    });

    await columns.settle();
    expect(columns.viewport).toBe(500);
    expect(columns.renderedIndices).toEqual(range(0, 7));
    expect(columns.rowTransform(2)).toBe('translateX(200px)');

    await columns.scroll(1250);
    expect(columns.range).toEqual({ start: 11, end: 19 });

    await columns.scrollToIndex(100, 'start');
    expect(columns.elementScroll).toBe(10_000);

    columns.unmount();

    const mirrored = VirtualHarness.mount({
      axis: 'x',
      count: 200,
      itemSize: 100,
      height: 500,
      dir: 'rtl',
    });

    await mirrored.settle();
    await mirrored.scroll(-1250);
    expect(mirrored.scrollTop).toBe(1250);
    expect(mirrored.range.start).toBeGreaterThanOrEqual(8);

    await mirrored.scrollToIndex(50, 'start');
    expect(mirrored.elementScroll).toBe(-5000);

    mirrored.unmount();
  });

  it('keeps the canvas below the ceiling and maps scroll positions through the scale', async () => {
    const list = VirtualHarness.mount({
      count: 1_000_000,
      itemSize: 40,
      height: 400,
      overscan: 0,
      maxSize: 10_000_000,
    });

    await list.settle();
    expect(list.totalSize).toBe(40_000_000);
    expect(list.canvasSize).toBe(10_000_000);
    expect(list.shift).toBe(0);
    expect(list.renderedIndices).toEqual(range(0, 11));

    await list.scroll(5_000_000);
    const factor = (40_000_000 - 400) / (10_000_000 - 400);
    expect(list.scrollTop).toBeCloseTo(5_000_000 * factor, 3);
    expect(list.range.start).toBe(Math.floor((5_000_000 * factor) / 40));

    const first = list.items[0];
    expect(first?.offset).toBeGreaterThan(5_000_000 - 40);
    expect(first?.offset).toBeLessThanOrEqual(5_000_000);
    expect(list.spacers.start).toBe(first?.offset ?? -1);
    expect(list.spacers.end).toBeGreaterThanOrEqual(0);

    await list.scrollToIndex(999_999, 'start');
    expect(list.elementScroll).toBeCloseTo(10_000_000 - 400, 3);
    expect(list.renderedIndices.at(-1)).toBe(999_999);
    expect(list.spacers.end).toBeCloseTo(0, 3);

    list.unmount();

    expect(canvasScaleFor(1000, 100, undefined)).toEqual({ canvas: 1000, factor: 1 });
    expect(canvasScaleFor(1000, 100, 2000)).toEqual({ canvas: 1000, factor: 1 });
    expect(canvasScaleFor(1000, 600, 500)).toEqual({ canvas: 1000, factor: 1 });
    expect(canvasScaleFor(1900, 100, 1000)).toEqual({ canvas: 1000, factor: 2 });
  });

  it('leaves the space under a sticky inset out of the window and the scroll targets', async () => {
    const list = VirtualHarness.mount({ height: 200, itemSize: 20, overscan: 0, inset: 40 });
    await list.settle();
    expect(list.range).toEqual({ start: 0, end: 9 });

    await list.scrollToIndex(20, 'end');
    expect(list.scrollTop).toBe(260);

    await list.scrollToIndex(19, 'auto');
    expect(list.scrollTop).toBe(260);

    await list.scrollToIndex(21, 'auto');
    expect(list.scrollTop).toBe(280);

    await list.scrollToIndex(999, 'start');
    expect(list.scrollTop).toBe(19_840);

    list.unmount();
  });

  it('follows measured sizes from a size index without rebuilding the window', async () => {
    const index = createSizeIndex(100, 20);
    const list = VirtualHarness.mount({ count: 100, itemSize: index, height: 100, overscan: 0 });
    await list.settle();
    expect(list.totalSize).toBe(2000);
    expect(list.renderedIndices).toEqual(range(0, 6));
    expect(index.set(1, 60)).toBe(true);

    await list.settle();
    expect(list.totalSize).toBe(2040);
    expect(list.offsetOf(2)).toBe(80);
    expect(list.renderedIndices).toEqual(range(0, 4));
    expect(list.rowTransform(2)).toBe('translateY(80px)');
    expect(index.set(1, 60)).toBe(false);
    expect(index.set(500, 10)).toBe(false);

    await list.scroll(1000);
    expect(list.range).toEqual({ start: 48, end: 54 });

    index.resize(50);
    await list.setCount(50);
    expect(list.totalSize).toBe(1040);
    expect(list.range).toEqual({ start: 48, end: 50 });

    list.unmount();
  });
});
