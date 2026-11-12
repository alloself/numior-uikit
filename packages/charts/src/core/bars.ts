import type { BandScale } from './scales';
import {
  BarEnd,
  ChartStacking,
  type Box,
  type ChartSeries,
  type ChartSlot,
  type SceneBar,
} from './chart.types';

export interface BarFrame {
  readonly horizontal: boolean;
  readonly mirrored: boolean;
  readonly band: BandScale;
  readonly value: (value: number) => number;
  readonly baseline: number;
  readonly stacking: ChartStacking;
  readonly slots: readonly ChartSlot[];
}

interface Segment {
  readonly series: number;
  readonly index: number;
  readonly value: number;
  readonly from: number;
  readonly to: number;
  readonly start: number;
  readonly thickness: number;
  readonly round: boolean;
}

const MAX_THICKNESS = 24;

const SURFACE_GAP = 2;

const RADIUS = 4;

const fixed = (value: number): string => String(Math.round(value * 100) / 100);

const pathOf = (box: Box, end: BarEnd | undefined): string => {
  const { x, y, width, height } = box;
  const along = end === BarEnd.Top || end === BarEnd.Bottom;
  const radius = Math.min(RADIUS, along ? width / 2 : height / 2, along ? height : width);
  const r = fixed(radius);
  const arc = `A${r},${r} 0 0 1`;
  const [left, top, right, bottom] = [x, y, x + width, y + height].map(fixed);
  const [rightIn, bottomIn] = [x + width - radius, y + height - radius].map(fixed);
  const [leftIn, topIn] = [x + radius, y + radius].map(fixed);

  switch (end) {
    case BarEnd.Top:
      return `M${left},${bottom}V${topIn}${arc} ${leftIn},${top}H${rightIn}${arc} ${right},${topIn}V${bottom}Z`;
    case BarEnd.Bottom:
      return `M${left},${top}H${right}V${bottomIn}${arc} ${rightIn},${bottom}H${leftIn}${arc} ${left},${bottomIn}Z`;
    case BarEnd.Right:
      return `M${left},${top}H${rightIn}${arc} ${right},${topIn}V${bottomIn}${arc} ${rightIn},${bottom}H${left}Z`;
    case BarEnd.Left:
      return `M${right},${top}V${bottom}H${leftIn}${arc} ${left},${bottomIn}V${topIn}${arc} ${leftIn},${top}Z`;
    default:
      return `M${left},${top}H${right}V${bottom}H${left}Z`;
  }
};

const endOf = (frame: BarFrame, from: number, to: number): BarEnd => {
  if (frame.horizontal) {
    return to >= from ? 'right' : 'left';
  }
  return to <= from ? 'top' : 'bottom';
};

const barOf = (frame: BarFrame, segment: Segment): SceneBar | undefined => {
  const low = Math.min(segment.from, segment.to);
  const length = Math.abs(segment.to - segment.from);

  if (length < 0.5) {
    return undefined;
  }

  const box: Box = frame.horizontal
    ? { x: low, y: segment.start, width: length, height: segment.thickness }
    : { x: segment.start, y: low, width: segment.thickness, height: length };

  return {
    ...box,
    series: segment.series,
    index: segment.index,
    value: segment.value,
    slot: frame.slots[segment.series] ?? 0,
    path: pathOf(box, segment.round ? endOf(frame, segment.from, segment.to) : undefined),
  };
};

const valueAt = (series: ChartSeries, index: number): number | undefined => {
  const value = series.values[index];

  return value === null || value === undefined || !Number.isFinite(value) ? undefined : value;
};

const clustered = (frame: BarFrame, series: readonly ChartSeries[], index: number): Segment[] => {
  const count = Math.max(series.length, 1);
  const room = frame.band.width - SURFACE_GAP * (count - 1);
  const thickness = Math.max(Math.min(MAX_THICKNESS, room / count), 1);
  const group = thickness * count + SURFACE_GAP * (count - 1);
  const first = frame.band.start(index) + (frame.band.width - group) / 2;

  return series.reduce<Segment[]>((segments, item, position) => {
    const value = valueAt(item, index);

    if (value !== undefined) {
      segments.push({
        series: position,
        index,
        value,
        from: frame.baseline,
        to: frame.value(value),
        start:
          first + (frame.mirrored ? count - 1 - position : position) * (thickness + SURFACE_GAP),
        thickness,
        round: true,
      });
    }
    return segments;
  }, []);
};

const segmentStart = (frame: BarFrame, base: number, top: number): number => {
  if (base === 0) {
    return frame.baseline;
  }

  const from = frame.value(base);

  return from + Math.sign(frame.value(top) - from) * SURFACE_GAP;
};

const stacked = (frame: BarFrame, series: readonly ChartSeries[], index: number): Segment[] => {
  const values = series.map((item) => valueAt(item, index) ?? 0);
  const total = values.reduce((sum, value) => sum + Math.abs(value), 0);

  const share = (value: number): number =>
    frame.stacking === ChartStacking.Percent && total > 0 ? value / total : value;

  const thickness = Math.max(Math.min(MAX_THICKNESS, frame.band.width), 1);
  const start = frame.band.start(index) + (frame.band.width - thickness) / 2;
  const lastPositive = values.findLastIndex((value) => value > 0);
  const lastNegative = values.findLastIndex((value) => value < 0);
  const sums = { positive: 0, negative: 0 };

  return values.reduce<Segment[]>((segments, value, position) => {
    if (value === 0) {
      return segments;
    }

    const side = value > 0 ? 'positive' : 'negative';
    const base = sums[side];
    const top = base + share(value);

    sums[side] = top;

    segments.push({
      series: position,
      index,
      value,
      from: segmentStart(frame, base, top),
      to: frame.value(top),
      start,
      thickness,
      round: position === (value > 0 ? lastPositive : lastNegative),
    });

    return segments;
  }, []);
};

export const layoutBars = (
  frame: BarFrame,
  series: readonly ChartSeries[],
  count: number,
): SceneBar[] =>
  Array.from({ length: count }, (_unused, index) =>
    frame.stacking === ChartStacking.None
      ? clustered(frame, series, index)
      : stacked(frame, series, index),
  ).reduce<SceneBar[]>((bars, segments) => {
    segments.forEach((segment) => {
      const bar = barOf(frame, segment);

      if (bar === undefined) {
        return;
      }

      bars.push(bar);
    });

    return bars;
  }, []);
