import { describe, expect, it } from 'vite-plus/test';
import { layoutChart, type ChartScene, type ChartSpec, type ScenePoint } from '../src/core';

const SIZE = { width: 480, height: 300 };

const visits: ChartSpec = {
  kind: 'line',
  categories: { kind: 'text', labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  series: [
    { id: 'web', name: 'Web', values: [110, 118, null, 112, 120] },
    { id: 'app', name: 'App', values: [106, null, 108, null, 115] },
  ],
};

const pointsOf = (scene: ChartScene, series: number): ScenePoint[] =>
  scene.points.filter((point) => point.series === series);

const pathsOf = (scene: ChartScene, role: 'line' | 'area', series: number): string[] =>
  scene.paths.reduce<string[]>((found, path) => {
    if (path.role === role && path.series === series) {
      found.push(path.d);
    }
    return found;
  }, []);

const ticksOf = (scene: ChartScene): string[] =>
  scene.texts.reduce<string[]>((found, text) => {
    if (text.role === 'value-tick') {
      found.push(text.text);
    }
    return found;
  }, []);

const at = <T>(items: readonly T[], index: number): T => {
  const item = items.at(index);

  if (item === undefined) {
    throw new Error(`There is no item ${String(index)}`);
  }
  return item;
};

const startOf = (d: string): number[] => (/^M([\d.]+),([\d.]+)/.exec(d) ?? []).slice(1).map(Number);

describe('line and area layout', () => {
  it('joins values with lines, breaks them at gaps and marks lonely points', () => {
    const scene = layoutChart(visits, SIZE);
    const web = pointsOf(scene, 0);

    expect(scene.bars).toEqual([]);
    expect(web.map((point) => point.index)).toEqual([0, 1, 3, 4]);
    expect(pathsOf(scene, 'line', 0)).toHaveLength(2);
    expect(pathsOf(scene, 'line', 1)).toEqual([]);
    expect(pointsOf(scene, 1).every((point) => point.marker)).toBe(true);
    expect(web.map((point) => point.slot)).toEqual([1, 1, 1, 1]);
    expect(at(web, 0).x).toBeLessThan(at(web, 1).x);
    expect(at(web, 1).y).toBeLessThan(at(web, 0).y);
  });

  it('starts a line axis near its data and an area axis at zero', () => {
    const line = layoutChart(visits, SIZE);
    const area = layoutChart({ ...visits, kind: 'area' }, SIZE);

    expect(at(ticksOf(line), 0)).not.toBe('0');
    expect(at(ticksOf(area), 0)).toBe('0');
    expect(pathsOf(area, 'area', 0)).toHaveLength(2);
    expect(at(pathsOf(area, 'area', 0), 0)).toMatch(/Z$/);
  });

  it('stacks areas on the series below and fills percent stacks to the top', () => {
    const spec: ChartSpec = {
      kind: 'area',
      stacking: 'stacked',
      categories: { kind: 'text', labels: ['A', 'B', 'C'] },
      series: [
        { id: 'one', name: 'One', values: [10, 20, 30] },
        { id: 'two', name: 'Two', values: [5, null, 15] },
      ],
    };

    const stacked = layoutChart(spec, SIZE);
    const lower = pointsOf(stacked, 0);
    const upper = pointsOf(stacked, 1);

    expect(upper.map((point) => point.index)).toEqual([0, 1, 2]);
    expect(at(upper, 1).y).toBeCloseTo(at(lower, 1).y);
    expect(at(upper, 0).y).toBeLessThan(at(lower, 0).y);

    expect(pathsOf(stacked, 'area', 1)[0]).toContain(
      String(Math.round(at(lower, 2).y * 100) / 100),
    );

    const percent = layoutChart({ ...spec, stacking: 'percent' }, SIZE);

    expect(pointsOf(percent, 1).every((point) => Math.abs(point.y - percent.plot.y) < 0.01)).toBe(
      true,
    );

    expect(ticksOf(percent).at(-1)).toBe('100%');
  });

  it('spaces time categories by their dates', () => {
    const day = 86_400_000;
    const start = Date.UTC(2026, 0, 1);

    const scene = layoutChart(
      {
        kind: 'line',
        categories: { kind: 'time', values: [start, start + day, start + 10 * day] },
        series: [{ id: 'sales', name: 'Sales', values: [3, 4, 5] }],
      },
      SIZE,
    );

    const [first, second, third] = pointsOf(scene, 0).map((point) => point.x);

    expect(((third ?? 0) - (first ?? 0)) / ((second ?? 0) - (first ?? 0))).toBeCloseTo(10);
  });

  it('marks every point only while points stay sparse and mirrors lines in right-to-left layouts', () => {
    const dense: ChartSpec = {
      kind: 'line',
      categories: {
        kind: 'text',
        labels: Array.from({ length: 40 }, (_unused, index) => String(index)),
      },
      series: [
        { id: 'one', name: 'One', values: Array.from({ length: 40 }, (_unused, index) => index) },
      ],
    };

    expect(pointsOf(layoutChart(dense, SIZE), 0).some((point) => point.marker)).toBe(false);
    expect(pointsOf(layoutChart(visits, SIZE), 0).every((point) => point.marker)).toBe(true);

    const rtl = layoutChart(visits, SIZE, { rtl: true });
    const [first] = pathsOf(rtl, 'line', 0);

    expect(at(pointsOf(rtl, 0), 0).x).toBeGreaterThan(at(pointsOf(rtl, 0), 1).x);
    expect(at(startOf(first ?? ''), 0)).toBeGreaterThan(SIZE.width / 2);
  });
});
