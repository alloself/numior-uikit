import {
  ChartGaps,
  ScenePathRole,
  type ChartSeries,
  type ChartSlot,
  type ChartValue,
  type ScenePath,
  type ScenePoint,
} from './chart.types';

export interface LineFrame {
  readonly area: boolean;
  readonly at: (index: number) => number;
  readonly value: (value: number) => number;
  readonly baseline: number;
  readonly slots: readonly ChartSlot[];
  readonly markers: boolean;
  readonly gaps: ChartGaps;
}

export interface LineMarks {
  readonly paths: readonly ScenePath[];
  readonly points: readonly ScenePoint[];
}

interface Column {
  readonly key: number;
  readonly first: ScenePoint;
  low: ScenePoint;
  high: ScenePoint;
  last: ScenePoint;
}

type Run = readonly ScenePoint[];

export type StackTops = readonly (readonly number[])[];

const COLUMNS_PER_PIXEL = 2;

const fixed = (value: number): string => String(Math.round(value * 100) / 100);

const finiteOf = (value: ChartValue | undefined): number | undefined =>
  value === null || value === undefined || !Number.isFinite(value) ? undefined : value;

const totalsOf = (series: readonly ChartSeries[], count: number): number[] => {
  const totals = Array.from({ length: count }, () => 0);

  for (const item of series) {
    for (let index = 0; index < count; index += 1) {
      totals[index] = (totals[index] ?? 0) + Math.abs(finiteOf(item.values[index]) ?? 0);
    }
  }
  return totals;
};

const shareOf = (value: number, total: number): number => (total > 0 ? value / total : 0);

export const stackedTops = (
  series: readonly ChartSeries[],
  count: number,
  percent: boolean,
): StackTops => {
  const totals = percent ? totalsOf(series, count) : undefined;
  const running = Array.from({ length: count }, () => 0);

  return series.map((item) =>
    running.map((sum, index) => {
      const value = finiteOf(item.values[index]) ?? 0;
      const top = sum + (totals === undefined ? value : shareOf(value, totals[index] ?? 0));

      running[index] = top;
      return top;
    }),
  );
};

export const topsExtent = (stack: StackTops): readonly [number, number] => {
  let low = Infinity;
  let high = -Infinity;

  for (const tops of stack) {
    for (const top of tops) {
      low = Math.min(low, top);
      high = Math.max(high, top);
    }
  }
  return low > high ? [0, 1] : [low, high];
};

const closed = (run: ScenePoint[], markers: boolean): ScenePoint[] => {
  if (markers || run.length > 1) {
    return run;
  }
  return run.map((point) => ({ ...point, marker: true }));
};

const runsOf = (
  frame: LineFrame,
  item: ChartSeries,
  series: number,
  tops: readonly number[] | undefined,
  count: number,
): ScenePoint[][] => {
  const slot = frame.slots[series] ?? 0;
  const runs: ScenePoint[][] = [];
  let run: ScenePoint[] = [];

  for (let index = 0; index < count; index += 1) {
    const value = finiteOf(item.values[index]);
    const top = tops === undefined ? value : tops[index];

    if (top === undefined) {
      if (run.length > 0) {
        runs.push(closed(run, frame.markers));
      }
      run = [];
      continue;
    }

    run.push({
      series,
      index,
      value: value ?? 0,
      x: frame.at(index),
      y: frame.value(top),
      slot,
      marker: frame.markers,
    });
  }
  if (run.length > 0) {
    runs.push(closed(run, frame.markers));
  }
  return runs;
};

const joined = (runs: readonly Run[]): Run => (runs.length === 1 ? (runs[0] ?? []) : runs.flat());

const trace = (points: Run): string =>
  points
    .map((point, position) => `${position === 0 ? 'M' : 'L'}${fixed(point.x)},${fixed(point.y)}`)
    .join('');

const keepColumn = (kept: ScenePoint[], column: Column): void => {
  const chosen = [column.first, column.low, column.high, column.last].toSorted(
    (left, right) => left.index - right.index,
  );

  let previous: ScenePoint | undefined;

  for (const point of chosen) {
    if (point === previous) {
      continue;
    }

    kept.push(point);
    previous = point;
  }
};

const thinned = (run: Run): Run => {
  const kept: ScenePoint[] = [];
  let column: Column | undefined;

  for (const point of run) {
    const key = Math.floor(point.x * COLUMNS_PER_PIXEL);

    if (column?.key !== key) {
      if (column !== undefined) {
        keepColumn(kept, column);
      }
      column = { key, first: point, low: point, high: point, last: point };
      continue;
    }
    if (point.y < column.low.y) {
      column.low = point;
    }
    if (point.y > column.high.y) {
      column.high = point;
    }
    column.last = point;
  }
  if (column !== undefined) {
    keepColumn(kept, column);
  }
  return kept.length === run.length ? run : kept;
};

const floorOf = (frame: LineFrame, run: Run, below: Run | undefined): string =>
  (below ?? run)
    .toReversed()
    .map((point) => `L${fixed(point.x)},${fixed(below === undefined ? frame.baseline : point.y)}`)
    .join('');

const bridgesOf = (runs: readonly Run[]): ScenePoint[][] =>
  runs.reduce<{ last: ScenePoint | undefined; bridges: ScenePoint[][] }>(
    (state, run) => {
      const first = run[0];

      if (first === undefined) {
        return state;
      }
      if (state.last !== undefined && first.index > state.last.index + 1) {
        state.bridges.push([state.last, first]);
      }
      return { last: run.at(-1), bridges: state.bridges };
    },
    { last: undefined, bridges: [] },
  ).bridges;

const pathsOf = (
  frame: LineFrame,
  runs: readonly Run[],
  series: number,
  below: Run | undefined,
): { areas: ScenePath[]; lines: ScenePath[] } => {
  const slot = frame.slots[series] ?? 0;
  const connect = frame.gaps === ChartGaps.Connect;

  const drawn = runs.reduce<Run[]>((found, run) => {
    if (run.length < 2) {
      return found;
    }

    found.push(thinned(run));
    return found;
  }, []);

  const filled = connect ? [thinned(joined(runs))].filter((run) => run.length > 1) : drawn;

  const bridges = connect
    ? bridgesOf(runs).map((pair) => ({ role: ScenePathRole.Gap, series, slot, d: trace(pair) }))
    : [];

  return {
    areas: frame.area
      ? filled.map((run) => ({
          role: ScenePathRole.Area,
          series,
          slot,
          d: `${trace(run)}${floorOf(frame, run, below)}Z`,
        }))
      : [],
    lines: [
      ...drawn.map((run) => ({ role: ScenePathRole.Line, series, slot, d: trace(run) })),
      ...bridges,
    ],
  };
};

export const layoutLines = (
  frame: LineFrame,
  series: readonly ChartSeries[],
  count: number,
  tops: StackTops | undefined,
): LineMarks => {
  const areas: ScenePath[] = [];
  const lines: ScenePath[] = [];
  const points: ScenePoint[] = [];

  let floor: Run | undefined;

  series.forEach((item, position) => {
    const runs = runsOf(frame, item, position, tops?.[position], count);
    const drawn = pathsOf(frame, runs, position, floor);

    if (tops !== undefined) {
      floor = thinned(joined(runs));
    }
    for (const entry of drawn.areas) {
      areas.push(entry);
    }
    for (const entry of drawn.lines) {
      lines.push(entry);
    }
    for (const run of runs) {
      for (const point of run) {
        points.push(point);
      }
    }
  });

  return { paths: [...areas, ...lines], points };
};
