import { describe, expect, it } from 'vite-plus/test';
import { layoutChart, type ChartSpec, type SceneSlice } from '../src/core';

const SIZE = { width: 300, height: 240 };

const shares: ChartSpec = {
  kind: 'pie',
  categories: { kind: 'text', labels: ['Web', 'Stores', 'Partners', 'Returns', 'Other'] },
  series: [
    { id: 'sales', name: 'Sales', values: [50, 30, 20, -5, null] },
    { id: 'plan', name: 'Plan', values: [40, 40, 20, 0, 0] },
  ],
};

const at = <T>(items: readonly T[], index: number): T => {
  const item = items.at(index);

  if (item === undefined) {
    throw new Error(`There is no item ${String(index)}`);
  }
  return item;
};

const ringOf = (slices: readonly SceneSlice[], series: number): SceneSlice[] =>
  slices.filter((slice) => slice.series === series);

const distance = (slice: SceneSlice): number => Math.hypot(slice.x - 150, slice.y - 120);

describe('pie and doughnut layout', () => {
  it('cuts the first series into slices clockwise from twelve o’clock and skips empty values', () => {
    const scene = layoutChart(shares, SIZE);

    expect(scene.texts).toEqual([]);
    expect(scene.lines).toEqual([]);
    expect(scene.slices.map((slice) => slice.index)).toEqual([0, 1, 2]);
    expect(scene.slices.map((slice) => slice.share)).toEqual([0.5, 0.3, 0.2]);
    expect(scene.slices.map((slice) => slice.slot)).toEqual([1, 2, 3]);
    expect(at(scene.slices, 0).path).toMatch(/^M150,4A116,116 0 0 1 150,236L150,120Z$/);
    expect(at(scene.slices, 0).x).toBeGreaterThan(150);
    expect(at(scene.slices, 2).x).toBeLessThan(150);
  });

  it('draws one ring per series around a hole in a doughnut', () => {
    const scene = layoutChart({ ...shares, kind: 'doughnut' }, SIZE);
    const outer = ringOf(scene.slices, 0);
    const inner = ringOf(scene.slices, 1);

    expect(outer).toHaveLength(3);
    expect(inner).toHaveLength(3);
    expect(distance(at(outer, 0))).toBeGreaterThan(distance(at(inner, 0)));
    expect(distance(at(inner, 0))).toBeGreaterThan(116 * 0.6);
    expect(at(outer, 0).path).toContain('L');
  });

  it('closes a lonely value into a full ring and folds categories past the eighth into other', () => {
    const lonely = layoutChart(
      {
        kind: 'doughnut',
        categories: { kind: 'text', labels: ['All'] },
        series: [{ id: 'all', name: 'All', values: [7] }],
      },
      SIZE,
    );

    expect(at(lonely.slices, 0).share).toBe(1);
    expect(at(lonely.slices, 0).path.match(/A/g)).toHaveLength(4);

    const many = layoutChart(
      {
        kind: 'pie',
        categories: {
          kind: 'text',
          labels: Array.from({ length: 10 }, (_unused, index) => String(index)),
        },
        series: [{ id: 'all', name: 'All', values: Array.from({ length: 10 }, () => 1) }],
      },
      SIZE,
    );

    expect(many.slices.map((slice) => slice.slot)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0, 0]);
  });
});
