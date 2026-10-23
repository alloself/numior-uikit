import type { ChartSeries, ChartSlot, SceneSlice } from './chart.types';

export interface PieFrame {
  readonly cx: number;
  readonly cy: number;
  readonly radius: number;
  readonly hole: number;
  readonly slots: readonly ChartSlot[];
}

const FULL = Math.PI * 2;

const RING_GAP = 2;

const fixed = (value: number): string => String(Math.round(value * 100) / 100);

const pointAt = (frame: PieFrame, radius: number, angle: number): string =>
  `${fixed(frame.cx + radius * Math.sin(angle))},${fixed(frame.cy - radius * Math.cos(angle))}`;

const wedge = (frame: PieFrame, outer: number, inner: number, from: number, to: number): string => {
  const large = to - from > Math.PI ? 1 : 0;
  const o = fixed(outer);

  if (to - from >= FULL - 1e-9) {
    const half = from + Math.PI;
    const ring = `M${pointAt(frame, outer, from)}A${o},${o} 0 1 1 ${pointAt(frame, outer, half)}A${o},${o} 0 1 1 ${pointAt(frame, outer, from)}Z`;

    if (inner <= 0) {
      return ring;
    }

    const i = fixed(inner);

    return `${ring}M${pointAt(frame, inner, from)}A${i},${i} 0 1 0 ${pointAt(frame, inner, half)}A${i},${i} 0 1 0 ${pointAt(frame, inner, from)}Z`;
  }

  const rim = `M${pointAt(frame, outer, from)}A${o},${o} 0 ${String(large)} 1 ${pointAt(frame, outer, to)}`;

  if (inner <= 0) {
    return `${rim}L${fixed(frame.cx)},${fixed(frame.cy)}Z`;
  }

  const i = fixed(inner);

  return `${rim}L${pointAt(frame, inner, to)}A${i},${i} 0 ${String(large)} 0 ${pointAt(frame, inner, from)}Z`;
};

const positive = (value: number | null | undefined): number =>
  value === null || value === undefined || !Number.isFinite(value) || value <= 0 ? 0 : value;

const ringOf = (
  frame: PieFrame,
  item: ChartSeries,
  series: number,
  outer: number,
  inner: number,
): SceneSlice[] => {
  const values = item.values.map(positive);
  const total = values.reduce((sum, value) => sum + value, 0);
  let angle = 0;

  return values.reduce<SceneSlice[]>((slices, value, index) => {
    if (value === 0 || total === 0) {
      return slices;
    }

    const share = value / total;
    const from = angle;
    const to = angle + share * FULL;
    const middle = (from + to) / 2;
    const centroid = (outer + inner) / 2;

    angle = to;

    slices.push({
      series,
      index,
      value,
      share,
      from,
      to,
      inner,
      outer,
      slot: frame.slots[index] ?? 0,
      path: wedge(frame, outer, inner, from, to),
      x: frame.cx + centroid * Math.sin(middle),
      y: frame.cy - centroid * Math.cos(middle),
    });

    return slices;
  }, []);
};

export const layoutSlices = (frame: PieFrame, series: readonly ChartSeries[]): SceneSlice[] => {
  const rings = Math.max(series.length, 1);
  const thickness = (frame.radius - frame.hole - RING_GAP * (rings - 1)) / rings;

  return series.flatMap((item, position) => {
    const outer = frame.radius - position * (thickness + RING_GAP);

    return ringOf(frame, item, position, outer, Math.max(outer - thickness, 0));
  });
};
