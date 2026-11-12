import { describe, expect, it } from 'vite-plus/test';
import { layoutChart, type ChartScene, type ChartSpec } from '../src/core';

const SIZE = { width: 480, height: 300 };

const heights: ChartSpec = {
  kind: 'scatter',
  categories: { kind: 'number', values: [165, 170, 178, 182, Number.NaN, 190] },
  series: [
    { id: 'weight', name: 'Weight', values: [48, 55, 66, null, 80, 88] },
    { id: 'goal', name: 'Goal', values: [50, 56, 63, 69, 70, 79] },
  ],
  categoryAxis: { title: 'Height, cm' },
};

const DAY = 24 * 60 * 60 * 1000;

const HOUR = 60 * 60 * 1000;

const visits: ChartSpec = {
  kind: 'scatter',
  categories: {
    kind: 'time',
    values: [
      Date.UTC(2026, 2, 1),
      Date.UTC(2026, 2, 2),
      Date.UTC(2026, 2, 5),
      Date.UTC(2026, 2, 11),
    ],
  },
  series: [{ id: 'visits', name: 'Visits', values: [120, 135, 98, 160] }],
};

const grades: ChartSpec = {
  kind: 'scatter',
  categories: { kind: 'text', labels: ['Anna', 'Boris', 'Vera'] },
  series: [{ id: 'grade', name: 'Grade', values: [4, 5, 3] }],
};

const textsOf = (scene: ChartScene, role: string): string[] =>
  scene.texts.reduce<string[]>((found, text) => {
    if (text.role === role) {
      found.push(text.text);
    }
    return found;
  }, []);

const NEW_YORK_CLOCK = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const gridOf = (scene: ChartScene): number[] =>
  scene.lines.reduce<number[]>((found, line) => {
    if (line.x1 === line.x2) {
      found.push(line.x1);
    }
    return found;
  }, []);

const pointsOf = (scene: ChartScene, series: number, field: 'x' | 'index'): number[] =>
  scene.points.reduce<number[]>((found, point) => {
    if (point.series === series) {
      found.push(point[field]);
    }
    return found;
  }, []);

describe('scatter layout', () => {
  it('places a marker at every pair with a numeric x and leaves the rest out', () => {
    const scene = layoutChart(heights, SIZE);

    expect(scene.paths).toEqual([]);
    expect(scene.bars).toEqual([]);

    expect(pointsOf(scene, 0, 'index')).toEqual([0, 1, 2, 5]);

    expect(scene.points.every((point) => point.marker)).toBe(true);
    expect(scene.points.map((point) => point.slot)).toContain(2);
  });

  it('spaces markers by their x values on a nice axis that need not start at zero', () => {
    const scene = layoutChart(heights, SIZE);
    const [first = 0, second = 0, third = 0] = pointsOf(scene, 0, 'x');

    expect((third - first) / (second - first)).toBeCloseTo(13 / 5);
    expect(textsOf(scene, 'category-tick')[0]).not.toBe('0');
    expect(textsOf(scene, 'category-title')).toEqual(['Height, cm']);

    expect(scene.lines.reduce((count, line) => count + Number(line.x1 === line.x2), 0)).toBe(
      textsOf(scene, 'category-tick').length,
    );
  });

  it('mirrors the x axis in right-to-left layouts', () => {
    const scene = layoutChart(heights, SIZE, { rtl: true });
    const [first = 0, second = 0] = pointsOf(scene, 0, 'x');

    expect(first).toBeGreaterThan(second);
  });

  it('spaces markers by their moments on a time axis rounded out to its calendar ticks', () => {
    const scene = layoutChart(visits, SIZE);
    const [first = 0, second = 0, third = 0, fourth = 0] = pointsOf(scene, 0, 'x');
    const { plot } = scene;
    const ticks = textsOf(scene, 'category-tick');

    const grid = gridOf(scene);

    expect((third - first) / (second - first)).toBeCloseTo(4);
    expect((fourth - first) / (second - first)).toBeCloseTo(10);
    expect([grid[0], grid.at(-1)]).toEqual([plot.x, plot.x + plot.width]);
    expect(first).toBeGreaterThan(plot.x);
    expect(fourth).toBeLessThan(plot.x + plot.width);
    expect(ticks).toEqual(['Feb 28', 'Mar 2', 'Mar 4', 'Mar 6', 'Mar 8', 'Mar 10', 'Mar 12']);

    expect(scene.lines.reduce((count, line) => count + Number(line.x1 === line.x2), 0)).toBe(
      ticks.length,
    );
  });

  it('puts a single moment in the middle and reads the ticks in the time zone of the chart', () => {
    const single = layoutChart(
      { ...visits, categories: { kind: 'time', values: [Date.UTC(2026, 2, 1, 9)] } },
      SIZE,
    );

    const [only = 0] = pointsOf(single, 0, 'x');

    expect(only).toBeCloseTo(single.plot.x + single.plot.width / 2);

    const day = Date.UTC(2026, 2, 1);

    const kolkata = layoutChart(
      {
        ...visits,
        categories: { kind: 'time', values: [day, day + 6 * HOUR, day + 12 * HOUR, day + DAY] },
      },
      SIZE,
      { timeZone: 'Asia/Kolkata', formatTime: (value) => String(value) },
    );

    const ticks = textsOf(kolkata, 'category-tick').map(Number);

    expect(ticks.length).toBeGreaterThan(1);
    expect(ticks.every((tick) => (tick + 5.5 * HOUR) % HOUR === 0)).toBe(true);
  });

  it('places a marker over every text category and names the categories on the axis', () => {
    const scene = layoutChart(grades, SIZE);
    const [first = 0, second = 0, third = 0] = pointsOf(scene, 0, 'x');

    expect(pointsOf(scene, 0, 'index')).toEqual([0, 1, 2]);
    expect(second - first).toBeCloseTo(third - second);
    expect(textsOf(scene, 'category-tick')).toEqual(['Anna', 'Boris', 'Vera']);
  });

  it('rounds the ends of a time axis out to local midnights across a change of the clocks', () => {
    const scene = layoutChart(
      {
        ...visits,
        categories: {
          kind: 'time',
          values: [Date.UTC(2026, 2, 5, 14), Date.UTC(2026, 2, 10, 20)],
        },
      },
      SIZE,
      { timeZone: 'America/New_York', formatTime: (value) => String(value) },
    );

    const ticks = textsOf(scene, 'category-tick').map(Number);
    const grid = gridOf(scene);

    expect(ticks.length).toBeGreaterThan(2);
    expect(ticks.map((tick) => NEW_YORK_CLOCK.format(tick))).toEqual(ticks.map(() => '00:00'));
    expect([grid[0], grid.at(-1)]).toEqual([scene.plot.x, scene.plot.x + scene.plot.width]);
  });
});
