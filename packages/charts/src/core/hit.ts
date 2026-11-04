import {
  type ChartAxis,
  type ChartHit,
  type ChartScene,
  type SceneBar,
  type ScenePoint,
  type SceneSlice,
} from './chart.types';

export interface ScenePosition {
  readonly x: number;
  readonly y: number;
}

export interface SceneAnchor extends ScenePosition {
  readonly along: ChartAxis;
  readonly reach: number;
}

const POINT_REACH = 24;

const MARKER_REACH = 6;

const FULL = Math.PI * 2;

const nearestIndex = (positions: readonly number[], at: number): number =>
  positions.reduce(
    (best, position, index) =>
      Math.abs(position - at) < Math.abs((positions[best] ?? Infinity) - at) ? index : best,
    0,
  );

const sliceAt = (scene: ChartScene, { x, y }: ScenePosition): SceneSlice | undefined => {
  const cx = scene.plot.x + scene.plot.width / 2;
  const cy = scene.plot.y + scene.plot.height / 2;
  const distance = Math.hypot(x - cx, y - cy);
  const angle = (Math.atan2(x - cx, cy - y) + FULL) % FULL;

  return scene.slices.find(
    (slice) =>
      distance >= slice.inner && distance <= slice.outer && angle >= slice.from && angle < slice.to,
  );
};

const pointNear = (
  points: readonly ScenePoint[],
  { x, y }: ScenePosition,
): ScenePoint | undefined =>
  points.reduce<ScenePoint | undefined>((best, point) => {
    const reach = Math.hypot(point.x - x, point.y - y);

    return reach <= POINT_REACH &&
      (best === undefined || reach < Math.hypot(best.x - x, best.y - y))
      ? point
      : best;
  }, undefined);

const inside = (scene: ChartScene, { x, y }: ScenePosition): boolean =>
  x >= scene.plot.x &&
  x <= scene.plot.x + scene.plot.width &&
  y >= scene.plot.y &&
  y <= scene.plot.y + scene.plot.height;

export const hitAt = (scene: ChartScene, position: ScenePosition): ChartHit | undefined => {
  if (scene.slices.length > 0) {
    const slice = sliceAt(scene, position);

    return slice === undefined ? undefined : { index: slice.index, series: slice.series };
  }
  if (scene.axis === undefined) {
    const point = pointNear(scene.points, position);

    return point === undefined ? undefined : { index: point.index, series: point.series };
  }
  if (scene.axis.positions.length === 0 || !inside(scene, position)) {
    return undefined;
  }
  return {
    index: nearestIndex(scene.axis.positions, scene.axis.horizontal ? position.y : position.x),
    series: undefined,
  };
};

export const hitsOf = (scene: ChartScene): ChartHit[] => {
  if (scene.slices.length > 0) {
    return scene.slices.map((slice) => ({ index: slice.index, series: slice.series }));
  }
  if (scene.axis === undefined) {
    return scene.points.map((point) => ({ index: point.index, series: point.series }));
  }
  return scene.axis.positions.map((_position, index) => ({ index, series: undefined }));
};

const groupReach = (bars: readonly SceneBar[], position: number, horizontal: boolean): number =>
  bars.reduce(
    (reach, bar) =>
      Math.max(
        reach,
        horizontal
          ? Math.max(Math.abs(bar.y - position), Math.abs(bar.y + bar.height - position))
          : Math.max(Math.abs(bar.x - position), Math.abs(bar.x + bar.width - position)),
      ),
    0,
  );

export const anchorOf = (scene: ChartScene, hit: ChartHit): SceneAnchor => {
  const slice = scene.slices.find((item) => item.index === hit.index && item.series === hit.series);

  if (slice !== undefined) {
    return { x: slice.x, y: slice.y, along: 'x', reach: 0 };
  }
  if (scene.axis === undefined || hit.series !== undefined) {
    const point = scene.points.find(
      (item) => item.index === hit.index && item.series === hit.series,
    );

    return { x: point?.x ?? 0, y: point?.y ?? 0, along: 'x', reach: MARKER_REACH };
  }

  const position = scene.axis.positions[hit.index] ?? 0;
  const { horizontal } = scene.axis;

  const reach = groupReach(
    scene.bars.filter((bar) => bar.index === hit.index),
    position,
    horizontal,
  );

  return horizontal
    ? { x: scene.plot.x + scene.plot.width / 2, y: position, along: 'y', reach }
    : { x: position, y: scene.plot.y + scene.plot.height / 2, along: 'x', reach };
};
