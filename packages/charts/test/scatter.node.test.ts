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

const textsOf = (scene: ChartScene, role: string): string[] =>
  scene.texts.reduce<string[]>((found, text) => {
    if (text.role === role) {
      found.push(text.text);
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

    expect(scene.lines.filter((line) => line.x1 === line.x2).length).toBe(
      textsOf(scene, 'category-tick').length,
    );
  });

  it('mirrors the x axis in right-to-left layouts', () => {
    const scene = layoutChart(heights, SIZE, { rtl: true });
    const [first = 0, second = 0] = pointsOf(scene, 0, 'x');

    expect(first).toBeGreaterThan(second);
  });
});
