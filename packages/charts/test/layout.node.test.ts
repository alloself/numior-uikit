import { describe, expect, it } from 'vite-plus/test';
import { layoutChart, type ChartScene, type ChartSpec, type SceneBar } from '../src/core';

const SIZE = { width: 480, height: 300 };

const quarters: ChartSpec = {
  kind: 'column',
  categories: { kind: 'text', labels: ['Q1', 'Q2', 'Q3', 'Q4'] },
  series: [
    { id: 'north', name: 'North', values: [120, 80, null, 160] },
    { id: 'south', name: 'South', values: [60, 90, 40, -30] },
  ],
};

const texts = (scene: ChartScene, role: string): string[] =>
  scene.texts.reduce<string[]>((found, text) => {
    if (text.role === role) {
      found.push(text.text);
    }
    return found;
  }, []);

const barsOf = (scene: ChartScene, series: number): SceneBar[] =>
  scene.bars.filter((bar) => bar.series === series);

const end = (bar: SceneBar): number => bar.y;

const nth = <T>(items: readonly T[], index: number): T => {
  const item = items.at(index);

  if (item === undefined) {
    throw new Error(`There is no item ${String(index)}`);
  }
  return item;
};

const barOf = (scene: ChartScene, series: number, position: number): SceneBar =>
  nth(barsOf(scene, series), position);

const zeroOf = (scene: ChartScene): number =>
  nth(
    scene.lines.filter((line) => line.role === 'baseline'),
    0,
  ).y1;

const tickGaps = (scene: ChartScene): number[] => {
  const ticks = scene.texts.filter((text) => text.role === 'value-tick');

  return ticks.slice(1).map((text, index) => text.x - nth(ticks, index).x);
};

describe('chart layout', () => {
  it('lays out clustered columns inside the plot with value and category ticks', () => {
    const scene = layoutChart(quarters, SIZE);

    expect(texts(scene, 'value-tick')).toEqual(['-50', '0', '50', '100', '150', '200']);
    expect(texts(scene, 'category-tick')).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
    expect(scene.bars).toHaveLength(7);
    expect(scene.slots).toEqual([1, 2]);

    expect(
      scene.bars.every(
        (bar) =>
          bar.width <= 24 &&
          bar.x >= scene.plot.x &&
          bar.x + bar.width <= scene.plot.x + scene.plot.width &&
          bar.y >= scene.plot.y - 0.01 &&
          bar.y + bar.height <= scene.plot.y + scene.plot.height + 0.01,
      ),
    ).toBe(true);

    expect(scene.lines.filter((line) => line.role === 'baseline')).toHaveLength(1);
  });

  it('grows columns from the zero line and rounds only their data end', () => {
    const scene = layoutChart(quarters, SIZE);
    const zero = zeroOf(scene);
    const first = barOf(scene, 0, 0);
    const second = barOf(scene, 0, 1);
    const negative = barOf(scene, 1, -1);

    expect(first.y).toBeLessThan(zero);
    expect(first.y + first.height).toBeCloseTo(zero);
    expect(second.height / first.height).toBeCloseTo(80 / 120);
    expect(first.path).toMatch(/^M[\d.]+,[\d.]+V[\d.]+A4,4 0 0 1/u);
    expect(negative.y).toBeCloseTo(zero);
    expect(negative.path).toContain('A4,4');
    expect(barOf(scene, 1, 1).x).toBeCloseTo(second.x + first.width + 2);
  });

  it('stacks segments with a surface gap and rounds only the outer one', () => {
    const scene = layoutChart({ ...quarters, stacking: 'stacked' }, SIZE);
    const north = barOf(scene, 0, 0);
    const south = barOf(scene, 1, 0);

    expect(texts(scene, 'value-tick').at(-1)).toBe('200');
    expect(north.x).toBe(south.x);
    expect(south.y + south.height).toBeCloseTo(north.y - 2);
    expect(north.path).not.toContain('A');
    expect(south.path).toContain('A');
  });

  it('fills the plot with percent stacks', () => {
    const scene = layoutChart(
      {
        ...quarters,
        stacking: 'percent',
        series: quarters.series
          .slice(0, 1)
          .concat({ id: 'south', name: 'South', values: [60, 90, 40, 30] }),
      },
      SIZE,
    );

    const first = scene.bars.filter((bar) => bar.index === 0);
    const top = Math.min(...first.map(end));

    expect(texts(scene, 'value-tick')).toEqual(['0%', '20%', '40%', '60%', '80%', '100%']);
    expect(top).toBeCloseTo(scene.plot.y);
  });

  it('mirrors columns and puts the value axis on the right in right-to-left layouts', () => {
    const ltr = layoutChart(quarters, SIZE);
    const rtl = layoutChart(quarters, SIZE, { rtl: true });
    const tick = nth(rtl.texts, 0);
    const mirrored = nth(rtl.bars, 0);

    expect(tick).toMatchObject({ role: 'value-tick', anchor: 'start' });
    expect(tick.x).toBeGreaterThan(rtl.plot.x + rtl.plot.width);
    expect(mirrored.x + mirrored.width).toBeCloseTo(SIZE.width - nth(ltr.bars, 0).x, 0);
  });

  it('lays out horizontal bars with truncated category labels', () => {
    const scene = layoutChart(
      {
        kind: 'bar',
        categories: {
          kind: 'text',
          labels: ['A very long product name that will not fit', 'Short'],
        },
        series: [{ id: 'sales', name: 'Sales', values: [30, 12] }],
        valueAxis: { title: 'Units' },
      },
      SIZE,
    );

    const long = nth(scene.bars, 0);
    const short = nth(scene.bars, 1);

    expect(nth(texts(scene, 'category-tick'), 0).endsWith('…')).toBe(true);
    expect(texts(scene, 'category-tick')[1]).toBe('Short');
    expect(long.width).toBeGreaterThan(short.width);
    expect(long.path).toContain('A4,4');
    expect(long.y).toBeLessThan(short.y);
    expect(texts(scene, 'value-title')).toEqual(['Units']);
  });

  it('thins category labels that would collide and formats time categories', () => {
    const days = Array.from({ length: 30 }, (_unused, index) => Date.UTC(2026, 0, 1 + index));

    const scene = layoutChart(
      {
        kind: 'column',
        categories: { kind: 'time', values: days },
        series: [{ id: 'visits', name: 'Visits', values: days.map((_day, index) => index * 1500) }],
      },
      SIZE,
    );

    expect(texts(scene, 'category-tick').length).toBeLessThan(30);
    expect(texts(scene, 'category-tick')[0]).toBe('Jan 1');
    expect(texts(scene, 'value-tick').at(-1)).toBe('50K');
  });

  it('keeps the fixed palette order and folds series past the eighth into other', () => {
    const series = Array.from({ length: 10 }, (_unused, index) => ({
      id: String(index),
      name: `Series ${String(index)}`,
      values: [index + 1],
    }));

    expect(
      layoutChart({ ...quarters, series, categories: { kind: 'text', labels: ['All'] } }, SIZE)
        .slots,
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0, 0]);
  });

  it('draws a log axis over powers of ten', () => {
    const scene = layoutChart(
      {
        ...quarters,
        series: [{ id: 'a', name: 'A', values: [5, 50, 500, 5000] }],
        valueAxis: { scale: 'log' },
      },
      SIZE,
    );

    expect(texts(scene, 'value-tick')).toEqual(['1', '10', '100', '1K', '10K']);
  });

  it('drops value ticks until their labels fit along a narrow axis', () => {
    const shares: ChartSpec = {
      kind: 'bar',
      stacking: 'percent',
      categories: { kind: 'text', labels: ['Moscow', 'Kazan'] },
      series: [
        { id: 'online', name: 'Online', values: [48, 33] },
        { id: 'stores', name: 'Stores', values: [52, 67] },
      ],
    };

    const wide = layoutChart(shares, { width: 640, height: 240 }, { locale: 'ru-RU' });
    const narrow = layoutChart(shares, { width: 260, height: 240 }, { locale: 'ru-RU' });

    expect(texts(wide, 'value-tick')).toHaveLength(6);
    expect(texts(narrow, 'value-tick').length).toBeLessThan(6);
    expect(Math.min(...tickGaps(narrow))).toBeGreaterThan(40);
  });
});
