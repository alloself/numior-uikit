import {
  ChartGaps,
  ChartStacking,
  ScenePathRole,
  type ChartSeries,
  type ChartSlot,
  type ChartSpec,
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

interface Vertex {
  readonly index: number;
  readonly x: number;
  readonly y: number;
}

type Tops = readonly (readonly (number | undefined)[])[];

const fixed = (value: number): string => String(Math.round(value * 100) / 100);

const finiteOf = (value: ChartValue | undefined): number | undefined =>
  value === null || value === undefined || !Number.isFinite(value) ? undefined : value;

const totalsOf = (series: readonly ChartSeries[], count: number): number[] =>
  Array.from({ length: count }, (_unused, index) =>
    series.reduce((sum, item) => sum + Math.abs(finiteOf(item.values[index]) ?? 0), 0),
  );

const stackTops = (
  series: readonly ChartSeries[],
  count: number,
  stacking: ChartStacking,
): Tops => {
  if (stacking === ChartStacking.None) {
    return series.map((item) =>
      Array.from({ length: count }, (_unused, index) => finiteOf(item.values[index])),
    );
  }

  const totals = totalsOf(series, count);
  const running = Array.from({ length: count }, () => 0);

  return series.map((item) =>
    running.map((sum, index) => {
      const value = finiteOf(item.values[index]) ?? 0;
      const total = totals[index] ?? 0;

      const top =
        sum + (stacking === ChartStacking.Percent ? (total > 0 ? value / total : 0) : value);

      running[index] = top;
      return top;
    }),
  );
};

export const stackedLineExtent = (spec: ChartSpec, count: number): number[] =>
  stackTops(spec.series, count, spec.stacking ?? 'none').flatMap((tops) =>
    tops.filter((top) => top !== undefined),
  );

const runsOf = (frame: LineFrame, tops: readonly (number | undefined)[]): Vertex[][] =>
  tops.reduce<Vertex[][]>((runs, top, index) => {
    if (top === undefined) {
      runs.push([]);
      return runs;
    }

    const vertex = { index, x: frame.at(index), y: frame.value(top) };
    const last = runs.at(-1);

    if (last === undefined) {
      runs.push([vertex]);
    } else {
      last.push(vertex);
    }
    return runs;
  }, []);

const trace = (vertices: readonly Vertex[]): string =>
  vertices
    .map((vertex, position) => `${position === 0 ? 'M' : 'L'}${fixed(vertex.x)},${fixed(vertex.y)}`)
    .join('');

const floorOf = (
  frame: LineFrame,
  run: readonly Vertex[],
  below: readonly (number | undefined)[] | undefined,
): string =>
  run
    .toReversed()
    .map((vertex) => {
      const top = below?.[vertex.index];

      return `L${fixed(vertex.x)},${fixed(top === undefined ? frame.baseline : frame.value(top))}`;
    })
    .join('');

const bridgesOf = (runs: readonly (readonly Vertex[])[]): Vertex[][] =>
  runs.reduce<{ last: Vertex | undefined; bridges: Vertex[][] }>(
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
  runs: readonly (readonly Vertex[])[],
  series: number,
  below: readonly (number | undefined)[] | undefined,
): { areas: ScenePath[]; lines: ScenePath[] } => {
  const slot = frame.slots[series] ?? 0;
  const connect = frame.gaps === ChartGaps.Connect;
  const drawn = runs.filter((run) => run.length > 1);
  const filled = connect ? [runs.flat()].filter((run) => run.length > 1) : drawn;

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

const pointsOf = (
  frame: LineFrame,
  runs: readonly (readonly Vertex[])[],
  item: ChartSeries,
  series: number,
): ScenePoint[] =>
  runs.flatMap((run) =>
    run.map((vertex) => ({
      series,
      index: vertex.index,
      value: finiteOf(item.values[vertex.index]) ?? 0,
      x: vertex.x,
      y: vertex.y,
      slot: frame.slots[series] ?? 0,
      marker: frame.markers || run.length === 1,
    })),
  );

export const layoutLines = (
  frame: LineFrame,
  series: readonly ChartSeries[],
  count: number,
  stacking: ChartStacking,
): LineMarks => {
  const tops = stackTops(series, count, stacking);
  const areas: ScenePath[] = [];
  const lines: ScenePath[] = [];
  const points: ScenePoint[] = [];

  series.forEach((item, position) => {
    const runs = runsOf(frame, tops[position] ?? []);
    const below = stacking === ChartStacking.None ? undefined : tops[position - 1];
    const drawn = pathsOf(frame, runs, position, below);

    for (const entry of drawn.areas) {
      areas.push(entry);
    }
    for (const entry of drawn.lines) {
      lines.push(entry);
    }
    for (const entry of pointsOf(frame, runs, item, position)) {
      points.push(entry);
    }
  });

  return { paths: [...areas, ...lines], points };
};
