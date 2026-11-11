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

const drawn = (scene: ChartScene): string =>
  [
    ...scene.bars.map((bar) => bar.path),
    ...scene.paths.map((path) => path.d),
    ...scene.points.map((point) => `${String(point.x)},${String(point.y)}`),
  ].join(' ');

const timeLabels = (values: readonly number[]): string[] =>
  texts(
    layoutChart(
      {
        kind: 'line',
        categories: { kind: 'time', values },
        series: [{ id: 'a', name: 'A', values: values.map((_value, index) => index) }],
      },
      { width: 800, height: 300 },
    ),
    'category-tick',
  );

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

  it('tells the value ticks apart at any magnitude', () => {
    const steps = { kind: 'text', labels: ['a', 'b', 'c'] } as const;

    const millions = layoutChart(
      {
        kind: 'line',
        categories: steps,
        series: [{ id: 'a', name: 'A', values: [1_000_000, 1_004_000, 1_010_000] }],
      },
      SIZE,
    );

    const fractions = layoutChart(
      {
        kind: 'column',
        categories: steps,
        series: [{ id: 'a', name: 'A', values: [250_000, 900_000, 1_250_000] }],
      },
      SIZE,
    );

    const tiny = layoutChart(
      {
        kind: 'column',
        categories: steps,
        series: [{ id: 'a', name: 'A', values: [1e-9, 3e-9, 5e-9] }],
      },
      SIZE,
    );

    expect(texts(millions, 'value-tick')).toEqual([
      '1M',
      '1.002M',
      '1.004M',
      '1.006M',
      '1.008M',
      '1.01M',
    ]);

    expect(texts(fractions, 'value-tick')).toEqual(['0', '250K', '500K', '750K', '1M', '1.25M']);
    expect(texts(tiny, 'value-tick')).toEqual(['0', '1E-9', '2E-9', '3E-9', '4E-9', '5E-9']);
  });

  it('keeps category labels readable when there are more categories than pixels', () => {
    const days = Array.from({ length: 10_000 }, (_unused, index) => Date.UTC(2000, 0, 1 + index));
    const values = days.map((_day, index) => index % 17);

    const line = layoutChart(
      {
        kind: 'line',
        categories: { kind: 'time', values: days },
        series: [{ id: 'a', name: 'A', values }],
      },
      { width: 800, height: 300 },
    );

    const bars = layoutChart(
      {
        kind: 'bar',
        categories: { kind: 'text', labels: days.map((_day, index) => `Item ${String(index)}`) },
        series: [{ id: 'a', name: 'A', values }],
      },
      { width: 800, height: 300 },
    );

    const across = line.texts.filter((text) => text.role === 'category-tick');
    const down = bars.texts.filter((text) => text.role === 'category-tick');

    expect(across.length).toBeGreaterThan(4);
    expect(across.every((text) => !text.text.includes('…'))).toBe(true);
    expect(new Set(across.map((text) => text.text)).size).toBe(across.length);
    expect(nth(across, 1).x - nth(across, 0).x).toBeGreaterThan(40);
    expect(down.length).toBeGreaterThan(4);
    expect(nth(down, 1).y - nth(down, 0).y).toBeGreaterThanOrEqual(15);
  });

  it('formats only the labels that could ever be shown', () => {
    const hours = Array.from({ length: 10_000 }, (_unused, index) => index * 3_600_000);
    const asked: number[] = [];

    const scene = layoutChart(
      {
        kind: 'line',
        categories: { kind: 'time', values: hours },
        series: [{ id: 'a', name: 'A', values: hours.map((_hour, index) => index % 7) }],
      },
      { width: 800, height: 300 },
      {
        formatTime: (value) => {
          asked.push(value);
          return `t${String(value / 3_600_000)}`;
        },
      },
    );

    expect(asked.length).toBeLessThanOrEqual(2000);
    expect(texts(scene, 'category-tick')[0]).toBe('t0');
    expect(texts(scene, 'category-tick').length).toBeGreaterThan(4);
  });

  it('labels time categories by the grain of their values', () => {
    expect(timeLabels([Date.UTC(2026, 2, 2)])).toEqual(['Mar 2']);
    expect(timeLabels([Date.UTC(2026, 2, 1), Date.UTC(2026, 2, 2)])).toEqual(['Mar 1', 'Mar 2']);

    expect(timeLabels([Date.UTC(2026, 0, 1), Date.UTC(2026, 0, 2), Date.UTC(2026, 5, 1)])).toEqual([
      'Jan 1',
      'Jun 1',
    ]);

    expect(timeLabels([Date.UTC(2025, 11, 31), Date.UTC(2026, 0, 1)])).toEqual([
      'Dec 31, 2025',
      'Jan 1, 2026',
    ]);

    expect(timeLabels([Date.UTC(2026, 0, 1), Date.UTC(2026, 1, 1)])).toEqual([
      'Jan 2026',
      'Feb 2026',
    ]);

    expect(timeLabels([Date.UTC(2026, 0, 1), Date.UTC(2026, 0, 31)])).toEqual(['Jan 1', 'Jan 31']);

    expect(timeLabels([Date.UTC(2026, 2, 1, 21), Date.UTC(2026, 2, 2, 21)])).toEqual([
      'Mar 1',
      'Mar 2',
    ]);

    expect(timeLabels([Date.UTC(2025, 11, 1), Date.UTC(2026, 5, 1)])).toEqual([
      'Dec 2025',
      'Jun 2026',
    ]);

    expect(timeLabels([Date.UTC(2026, 2, 2, 9), Date.UTC(2026, 2, 2, 15)])).toEqual([
      '09:00 AM',
      '03:00 PM',
    ]);
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

  it('labels the fractions of a log axis', () => {
    const scene = layoutChart(
      {
        ...quarters,
        series: [{ id: 'a', name: 'A', values: [0.05, 0.5, 2, 5] }],
        valueAxis: { scale: 'log' },
      },
      SIZE,
    );

    expect(texts(scene, 'value-tick')).toEqual(['0.01', '0.1', '1', '10']);
  });

  it('leaves the values a log axis cannot show out of the picture', () => {
    const steps = { kind: 'text', labels: ['a', 'b', 'c', 'd'] } as const;

    const columns = layoutChart(
      {
        kind: 'column',
        categories: steps,
        series: [{ id: 'a', name: 'A', values: [0, -5, 50, 500] }],
        valueAxis: { scale: 'log' },
      },
      SIZE,
    );

    const line = layoutChart(
      {
        kind: 'line',
        categories: steps,
        series: [{ id: 'a', name: 'A', values: [0, -5, 50, 500] }],
        valueAxis: { scale: 'log' },
      },
      SIZE,
    );

    expect(columns.bars.map((bar) => bar.index)).toEqual([2, 3]);
    expect(line.points.map((point) => point.index)).toEqual([2, 3]);
    expect(drawn(columns)).not.toMatch(/NaN|Infinity/);
    expect(drawn(line)).not.toMatch(/NaN|Infinity/);
  });

  it('ignores a bound of a log axis that is not positive', () => {
    const scene = layoutChart(
      {
        kind: 'line',
        categories: { kind: 'text', labels: ['a', 'b', 'c'] },
        series: [{ id: 'a', name: 'A', values: [1, 10, 100] }],
        valueAxis: { scale: 'log', min: 0, max: -1 },
      },
      SIZE,
    );

    expect(texts(scene, 'value-tick')).toEqual(['1', '10', '100']);
  });

  it('thins the ticks of a long log axis to the room it has', () => {
    const scene = layoutChart(
      {
        kind: 'line',
        categories: { kind: 'text', labels: ['a', 'b'] },
        series: [{ id: 'a', name: 'A', values: [1, 1e12] }],
        valueAxis: { scale: 'log' },
      },
      { width: 300, height: 120 },
    );

    expect(texts(scene, 'value-tick')).toEqual(['1', '1K', '1M', '1B', '1T']);
  });

  it('keeps the ticks inside a value axis bounded by hand and clips the marks to the plot', () => {
    const scene = layoutChart(
      {
        kind: 'column',
        categories: { kind: 'text', labels: ['a', 'b'] },
        series: [{ id: 'a', name: 'A', values: [40, 90] }],
        valueAxis: { max: 50 },
      },
      SIZE,
    );

    const { plot } = scene;
    const inside = (y: number): boolean => y >= plot.y - 0.01 && y <= plot.y + plot.height + 0.01;

    expect(texts(scene, 'value-tick')).toEqual(['0', '10', '20', '30', '40', '50']);
    expect(scene.texts.every((text) => text.role !== 'value-tick' || inside(text.y))).toBe(true);
    expect(scene.lines.every((line) => inside(line.y1))).toBe(true);

    expect(scene.clip).toEqual({
      x: plot.x - 1,
      y: plot.y - 1,
      width: plot.width + 2,
      height: plot.height + 2,
    });

    expect(layoutChart(quarters, SIZE).clip).toBeUndefined();
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

  it('lays out a series too long to spread into a call', () => {
    const values = Array.from({ length: 150_000 }, (_, index) => index % 1000);

    const scene = layoutChart(
      {
        kind: 'line',
        categories: { kind: 'number', values: values.map((_, index) => index) },
        series: [{ id: 'load', name: 'Load', values }],
      },
      SIZE,
    );

    expect(texts(scene, 'value-tick').at(-1)).toBe('1,000');
  });
});
