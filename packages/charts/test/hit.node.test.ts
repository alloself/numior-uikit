import { describe, expect, it } from 'vite-plus/test';
import { anchorOf, hitAt, hitsOf, layoutChart, type ChartSpec } from '../src/core';

const SIZE = { width: 480, height: 300 };

const sales: ChartSpec = {
  kind: 'column',
  categories: { kind: 'text', labels: ['Q1', 'Q2', 'Q3'] },
  series: [
    { id: 'a', name: 'A', values: [3, 5, 4] },
    { id: 'b', name: 'B', values: [2, 6, 1] },
  ],
};

const centreOf = (spec: ChartSpec, index: number): number => {
  const position = layoutChart(spec, SIZE).axis?.positions[index];

  if (position === undefined) {
    throw new Error(`There is no category ${String(index)}`);
  }
  return position;
};

describe('chart hit testing', () => {
  it('finds the category under the pointer on columns, bars and lines and ignores the margins', () => {
    const columns = layoutChart(sales, SIZE);
    const middle = columns.plot.y + columns.plot.height / 2;

    expect(hitAt(columns, { x: centreOf(sales, 1) + 10, y: middle })).toEqual({
      index: 1,
      series: undefined,
    });

    expect(hitAt(columns, { x: 1, y: middle })).toBeUndefined();

    const bars = layoutChart({ ...sales, kind: 'bar' }, SIZE);

    expect(hitAt(bars, { x: bars.plot.x + 5, y: centreOf({ ...sales, kind: 'bar' }, 2) })).toEqual({
      index: 2,
      series: undefined,
    });

    const line = layoutChart({ ...sales, kind: 'line' }, SIZE, { rtl: true });

    expect(hitAt(line, { x: line.plot.x + line.plot.width - 4, y: middle })?.index).toBe(0);
    expect(hitsOf(line)).toHaveLength(3);
    expect(anchorOf(line, { index: 0, series: undefined }).x).toBeGreaterThan(SIZE.width / 2);
  });

  it('finds the slice under the pointer by angle and ring', () => {
    const pie = layoutChart({ ...sales, kind: 'doughnut' }, SIZE);
    const cx = SIZE.width / 2;
    const cy = SIZE.height / 2;
    const radius = pie.plot.width / 2;

    expect(hitAt(pie, { x: cx + 4, y: cy - radius + 6 })).toEqual({ index: 0, series: 0 });
    expect(hitAt(pie, { x: cx - 4, y: cy - radius + 6 })).toEqual({ index: 2, series: 0 });
    expect(hitAt(pie, { x: cx, y: cy })).toBeUndefined();
    expect(hitsOf(pie)).toHaveLength(6);
    expect(anchorOf(pie, { index: 1, series: 1 }).y).toBeGreaterThan(cy);
  });

  it('anchors tooltips past the hovered group, beside columns and above or below bars', () => {
    const columns = layoutChart(sales, SIZE);
    const columnAnchor = anchorOf(columns, { index: 1, series: undefined });

    expect(columnAnchor.along).toBe('x');
    expect(columnAnchor.reach).toBeGreaterThan(10);

    const bars = layoutChart({ ...sales, kind: 'bar' }, SIZE);

    expect(anchorOf(bars, { index: 0, series: undefined }).along).toBe('y');

    expect(
      anchorOf(layoutChart({ ...sales, kind: 'line' }, SIZE), { index: 0, series: undefined })
        .reach,
    ).toBe(0);
  });

  it('finds the nearest scatter point within reach', () => {
    const scatter = layoutChart(
      {
        kind: 'scatter',
        categories: { kind: 'number', values: [1, 2, 3] },
        series: [{ id: 'a', name: 'A', values: [3, 5, 4] }],
      },
      SIZE,
    );

    const [, second] = scatter.points;

    expect(hitAt(scatter, { x: (second?.x ?? 0) + 6, y: (second?.y ?? 0) - 6 })).toEqual({
      index: 1,
      series: 0,
    });

    expect(hitAt(scatter, { x: 0, y: 0 })).toBeUndefined();

    expect(anchorOf(scatter, { index: 1, series: 0 })).toMatchObject({
      x: second?.x,
      y: second?.y,
    });
  });
});
