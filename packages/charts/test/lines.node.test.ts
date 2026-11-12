import { describe, expect, it } from 'vite-plus/test';
import { layoutChart, type ChartScene, type ChartSpec, type ScenePoint } from '../src/core';

const SIZE = { width: 480, height: 300 };

const LONG = 200_000;

const SPIKE = 123_457;

const BUDGET_MS = 100;

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

const pathsOf = (scene: ChartScene, role: 'line' | 'area' | 'gap', series: number): string[] =>
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

const verticesOf = (d: string): number => d.split(/[ML]/u).length - 1;

const shown = (value: number): string => String(Math.round(value * 100) / 100);

const moments = Array.from(
  { length: LONG },
  (_unused, index) => Date.UTC(2026, 0, 1) + index * 60_000,
);

const wave = (count: number): number[] =>
  Array.from({ length: count }, (_unused, index) => Math.sin(index / 500) * 100 + (index % 7));

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

  it('bridges gaps with a dashed stroke and one area when gaps connect', () => {
    const broken = layoutChart(visits, SIZE);
    const connected = layoutChart({ ...visits, gaps: 'connect' }, SIZE);
    const web = pointsOf(connected, 0);
    const [bridge] = pathsOf(connected, 'gap', 0);

    expect(pathsOf(broken, 'gap', 0)).toEqual([]);
    expect(pathsOf(connected, 'line', 0)).toEqual(pathsOf(broken, 'line', 0));
    expect(pathsOf(connected, 'gap', 0)).toHaveLength(1);

    expect(startOf(bridge ?? '')).toEqual(
      [at(web, 1).x, at(web, 1).y].map((value) => Math.round(value * 100) / 100),
    );

    expect(pathsOf(connected, 'gap', 1)).toHaveLength(2);
    expect(pathsOf(connected, 'line', 1)).toEqual([]);

    const area = layoutChart({ ...visits, kind: 'area', gaps: 'connect' }, SIZE);

    expect(pathsOf(area, 'area', 0)).toHaveLength(1);
    expect(pathsOf(area, 'area', 1)).toHaveLength(1);
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

  it('draws a long series with a few vertices per pixel and keeps its peak and every point to point at', () => {
    const values = Array.from({ length: LONG }, (_unused, index) =>
      index === SPIKE ? 1000 : index % 3,
    );

    const scene = layoutChart(
      {
        kind: 'line',
        categories: { kind: 'time', values: moments },
        series: [{ id: 'load', name: 'Load', values }],
      },
      SIZE,
    );

    const [line = ''] = pathsOf(scene, 'line', 0);

    expect(verticesOf(line)).toBeLessThanOrEqual(SIZE.width * 2 * 4);
    expect(line).toContain(`,${shown(at(scene.points, SPIKE).y)}`);
    expect(scene.points).toHaveLength(LONG);
    expect(at(scene.points, SPIKE).value).toBe(1000);
  });

  it('closes a thinned stacked area on the thinned top of the series below', () => {
    const scene = layoutChart(
      {
        kind: 'area',
        stacking: 'stacked',
        categories: { kind: 'time', values: moments },
        series: [
          { id: 'web', name: 'Web', values: wave(LONG) },
          { id: 'app', name: 'App', values: wave(LONG).map((value) => value / 2 + 60) },
        ],
      },
      SIZE,
    );

    const [lower = ''] = pathsOf(scene, 'line', 0);
    const [upper = ''] = pathsOf(scene, 'area', 1);

    const lowerTop = lower.replace(/^M/u, 'L').split('L').filter(Boolean).toReversed().join('L');

    expect(upper.endsWith(`L${lowerTop}Z`)).toBe(true);
    expect(verticesOf(upper)).toBeLessThanOrEqual(SIZE.width * 2 * 4 * 2);
  });
});

describe('line layout cost', () => {
  it(
    'lays out an area over two hundred thousand moments within the budget',
    { tags: ['budget'] },
    () => {
      const spec: ChartSpec = {
        kind: 'area',
        categories: { kind: 'time', values: moments },
        series: [{ id: 'load', name: 'Load', values: wave(LONG) }],
      };

      const fastest = Math.min(
        ...Array.from({ length: 4 }, () => {
          const started = performance.now();

          layoutChart(spec, SIZE);
          return performance.now() - started;
        }),
      );

      expect(fastest).toBeLessThan(BUDGET_MS);
    },
  );
});
