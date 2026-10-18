import type { Assoc, MapResult, Mappable, StepMap } from '../transform/mapping.types';

export interface MirrorMaps {
  readonly maps: readonly StepMap[];
  readonly mirrors: ReadonlyMap<number, number>;
}

interface Hit {
  readonly index: number;
  readonly offset: number;
}

const insideOf = (map: StepMap, pos: number): Hit | undefined => {
  const index = map.ranges.findIndex(
    (range) => pos > range.start && pos < range.start + range.oldSize,
  );

  const range = map.ranges[index];

  return range === undefined ? undefined : { index, offset: pos - range.start };
};

const newStart = (map: StepMap, index: number): number | undefined => {
  let diff = 0;

  for (const [at, range] of map.ranges.entries()) {
    if (at === index) {
      return range.start + diff;
    }
    diff += range.newSize - range.oldSize;
  }
  return undefined;
};

const recovered = (
  { maps, mirrors }: MirrorMaps,
  at: number,
  pos: number,
): { readonly pos: number; readonly at: number } | undefined => {
  const twin = mirrors.get(at);
  const map = maps[at];
  const hit = map === undefined || twin === undefined ? undefined : insideOf(map, pos);
  const twinMap = twin === undefined ? undefined : maps[twin];

  const start =
    hit === undefined || twinMap === undefined ? undefined : newStart(twinMap, hit.index);

  return start === undefined || hit === undefined || twin === undefined
    ? undefined
    : { pos: start + hit.offset, at: twin };
};

export const mirrored = (chain: MirrorMaps): Mappable => {
  const mapResult = (from: number, assoc: Assoc = 1): MapResult => {
    let pos = from;
    let at = 0;
    let deleted = false;
    let deletedBefore = false;
    let deletedAfter = false;
    let deletedAcross = false;

    while (at < chain.maps.length) {
      const jump = recovered(chain, at, pos);
      const map = chain.maps[at];

      if (jump !== undefined) {
        pos = jump.pos;
        at = jump.at + 1;
      } else if (map === undefined) {
        at += 1;
      } else {
        const result = map.mapResult(pos, assoc);

        pos = result.pos;
        deleted ||= result.deleted;
        deletedBefore ||= result.deletedBefore;
        deletedAfter ||= result.deletedAfter;
        deletedAcross ||= result.deletedAcross;
        at += 1;
      }
    }
    return { pos, deleted, deletedBefore, deletedAfter, deletedAcross };
  };

  return { mapResult, map: (pos, assoc) => mapResult(pos, assoc).pos };
};

const shifted = (mirrors: ReadonlyMap<number, number>): Map<number, number> =>
  new Map([...mirrors].map(([from, to]) => [from + 1, to + 1]));

export const passedStep = (chain: MirrorMaps, back: StepMap, ahead?: StepMap): MirrorMaps => {
  const mirrors = shifted(chain.mirrors);

  if (ahead === undefined) {
    return { maps: [back, ...chain.maps], mirrors };
  }
  const maps = [back, ...chain.maps, ahead];

  mirrors.set(0, maps.length - 1);
  return { maps, mirrors };
};
