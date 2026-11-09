import type { Assoc, MapResult, Mappable, StepMap } from '../transform/mapping.types';
import { mapStep, stepMapOf } from '../transform/step';
import { StepKind, type Step } from '../transform/step.types';

export interface MirrorMaps {
  readonly maps: readonly StepMap[];
  readonly mirrors: ReadonlyMap<number, number>;
  readonly edges?: ReadonlySet<number> | undefined;
}

export interface RebasedSteps {
  readonly steps: readonly Step[];
  readonly chain: MirrorMaps;
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

const atOrInsideOf = (map: StepMap, pos: number): Hit | undefined => {
  const index = map.ranges.findIndex(
    (range) => pos >= range.start && pos <= range.start + range.oldSize,
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
  { maps, mirrors, edges }: MirrorMaps,
  at: number,
  pos: number,
): { readonly pos: number; readonly at: number } | undefined => {
  const twin = mirrors.get(at);
  const map = maps[at];
  const found = edges?.has(at) === true ? atOrInsideOf : insideOf;
  const hit = map === undefined || twin === undefined ? undefined : found(map, pos);
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

const shiftedEdges = (edges: ReadonlySet<number> | undefined): Set<number> | undefined =>
  edges === undefined ? undefined : new Set([...edges].map((index) => index + 1));

const passedStep = (chain: MirrorMaps, back: StepMap, ahead?: StepMap): MirrorMaps => {
  const mirrors = shifted(chain.mirrors);
  const edges = shiftedEdges(chain.edges);

  if (ahead === undefined) {
    return { maps: [back, ...chain.maps], mirrors, edges };
  }
  const maps = [back, ...chain.maps, ahead];

  mirrors.set(0, maps.length - 1);
  return { maps, mirrors, edges };
};

const idle = (step: Step): boolean => {
  switch (step.kind) {
    case StepKind.Replace:
      return step.from === step.to && step.slice.content.length === 0;
    case StepKind.AddMark:
    case StepKind.RemoveMark:
      return step.from >= step.to;
    default:
      return false;
  }
};

const movedStep = (step: Step, chain: MirrorMaps): Step | undefined => {
  const moved = mapStep(step, mirrored(chain));

  return moved === undefined || idle(moved) ? undefined : moved;
};

export const rebaseSteps = (
  steps: readonly Step[],
  chain: MirrorMaps,
  accept?: (moved: Step) => boolean,
): RebasedSteps =>
  steps.reduce<RebasedSteps>(
    (done, step) => {
      const moved = movedStep(step, done.chain);
      const back = stepMapOf(step).invert();

      return moved === undefined || accept?.(moved) === false
        ? { steps: done.steps, chain: passedStep(done.chain, back) }
        : {
            steps: [...done.steps, moved],
            chain: passedStep(done.chain, back, stepMapOf(moved)),
          };
    },
    { steps: [], chain },
  );
