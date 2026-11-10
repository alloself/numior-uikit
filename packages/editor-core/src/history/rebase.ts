import type { Doc } from '../doc/doc.types';
import {
  StepMapKind,
  type Assoc,
  type MapResult,
  type MapSpan,
  type Mappable,
  type StepMap,
} from '../transform/mapping.types';
import { createStepMap } from '../transform/mapping';
import { mapStep, stepMapOf } from '../transform/step';
import { StepKind, type Step, type StepSpan } from '../transform/step.types';
import { noteRemoved, retargeted, withLatestNodes, type RemovedNodes } from './retarget';

export interface MirrorMaps {
  readonly maps: readonly StepMap[];
  readonly mirrors: ReadonlyMap<number, number>;
  readonly edges?: ReadonlySet<number> | undefined;
}

export interface RebasedSteps {
  readonly steps: readonly Step[];
  readonly chain: MirrorMaps;
}

export interface RebaseDocs {
  readonly written: (index: number) => Doc;
  readonly current: () => Doc;
}

type Removal = Extract<Step, { readonly kind: 'replace' }>;

interface Moved {
  readonly steps: readonly Step[];
  readonly map: StepMap | undefined;
}

interface Walk {
  pos: number;
  at: number;
  deleted: boolean;
  deletedBefore: boolean;
  deletedAfter: boolean;
  deletedAcross: boolean;
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

const walkFrom = (pos: number): Walk => ({
  pos,
  at: 0,
  deleted: false,
  deletedBefore: false,
  deletedAfter: false,
  deletedAcross: false,
});

const passed = (walk: Walk, result: MapResult): void => {
  walk.pos = result.pos;
  walk.deleted ||= result.deleted;
  walk.deletedBefore ||= result.deletedBefore;
  walk.deletedAfter ||= result.deletedAfter;
  walk.deletedAcross ||= result.deletedAcross;
  walk.at += 1;
};

const advance = (chain: MirrorMaps, walk: Walk, assoc: Assoc): void => {
  const jump = recovered(chain, walk.at, walk.pos);
  const map = chain.maps[walk.at];

  if (jump !== undefined) {
    walk.pos = jump.pos;
    walk.at = jump.at + 1;
  } else if (map === undefined) {
    walk.at += 1;
  } else {
    passed(walk, map.mapResult(walk.pos, assoc));
  }
};

const reached = ({
  pos,
  deleted,
  deletedBefore,
  deletedAfter,
  deletedAcross,
}: Walk): MapResult => ({
  pos,
  deleted,
  deletedBefore,
  deletedAfter,
  deletedAcross,
});

const together = (chain: MirrorMaps, left: Walk, right: Walk, outward: boolean): boolean => {
  const map = chain.maps[left.at];

  if (
    map === undefined ||
    recovered(chain, left.at, left.pos) !== undefined ||
    recovered(chain, right.at, right.pos) !== undefined
  ) {
    advance(chain, left, outward ? -1 : 1);
    advance(chain, right, outward ? 1 : -1);
    return true;
  }
  const span = map.mapSpan(left.pos, right.pos, outward);

  if (span === undefined) {
    return false;
  }
  passed(left, span.from);
  passed(right, span.to);
  return true;
};

const alone = (chain: MirrorMaps, left: Walk, right: Walk, outward: boolean): boolean => {
  const behind = left.at < right.at ? left : right;

  if (chain.maps[behind.at]?.kind === StepMapKind.Move) {
    return false;
  }
  advance(chain, behind, (behind === left) === outward ? -1 : 1);
  return true;
};

export const mirrored = (chain: MirrorMaps): Mappable => {
  const mapResult = (from: number, assoc: Assoc = 1): MapResult => {
    const walk = walkFrom(from);

    while (walk.at < chain.maps.length) {
      advance(chain, walk, assoc);
    }
    return reached(walk);
  };

  const mapSpan = (from: number, to: number, outward = false): MapSpan | undefined => {
    const left = walkFrom(from);
    const right = walkFrom(to);

    while (left.at < chain.maps.length || right.at < chain.maps.length) {
      const whole =
        left.at === right.at
          ? together(chain, left, right, outward)
          : alone(chain, left, right, outward);

      if (!whole) {
        return undefined;
      }
    }
    return { from: reached(left), to: reached(right) };
  };

  return { mapResult, mapSpan, map: (pos, assoc) => mapResult(pos, assoc).pos };
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
    case StepKind.Move:
      return step.from >= step.to || (step.target >= step.from && step.target <= step.to);
    default:
      return false;
  }
};

const placed = (
  step: Step,
  mapper: Mappable,
  index: number,
  docs: RebaseDocs | undefined,
): Step | undefined =>
  (docs === undefined
    ? undefined
    : retargeted(step, mapper, docs.written(index), docs.current())) ?? mapStep(step, mapper);

const movedStep = (
  step: Step,
  chain: MirrorMaps,
  index: number,
  docs: RebaseDocs | undefined,
  removed: RemovedNodes,
): Step | undefined => {
  const moved = placed(step, mirrored(chain), index, docs);

  if (moved === undefined || idle(moved)) {
    return undefined;
  }
  if (docs === undefined) {
    return moved;
  }

  noteRemoved(moved, docs.current(), removed);
  return withLatestNodes(moved, docs.current(), docs.written(index), removed);
};

const NOTHING: Moved = { steps: [], map: undefined };

const single = (moved: Step | undefined): Moved =>
  moved === undefined ? NOTHING : { steps: [moved], map: stepMapOf(moved) };

const isRemoval = (step: Step): step is Removal =>
  step.kind === StepKind.Replace && step.from < step.to && step.slice.content.length === 0;

const sparedSpans = (from: number, to: number, mapper: Mappable): readonly StepSpan[] => {
  const spans: StepSpan[] = [];
  let start = mapper.map(from, 1);

  for (let pos = from + 1; pos < to; pos += 1) {
    const before = mapper.map(pos, -1);
    const after = mapper.map(pos, 1);

    if (after > before && before > start) {
      spans.push({ from: start, to: before });
    }
    start = after > before ? Math.max(start, after) : start;
  }
  const end = mapper.map(to, -1);

  if (end > start) {
    spans.push({ from: start, to: end });
  }
  return spans;
};

const removalsOf = (step: Removal, mapper: Mappable): Moved => {
  const spans = sparedSpans(step.from, step.to, mapper);

  return spans.length === 0
    ? NOTHING
    : {
        steps: spans.toReversed().map((span) => ({ ...step, ...span })),
        map: createStepMap(
          spans.map((span) => ({ start: span.from, oldSize: span.to - span.from, newSize: 0 })),
        ),
      };
};

const rebasedWith = (
  steps: readonly Step[],
  chain: MirrorMaps,
  move: (step: Step, chain: MirrorMaps, index: number) => Moved,
): RebasedSteps =>
  steps.reduce<RebasedSteps>(
    (done, step, index) => {
      const moved = move(step, done.chain, index);
      const back = stepMapOf(step).invert();

      return moved.map === undefined
        ? { steps: done.steps, chain: passedStep(done.chain, back) }
        : {
            steps: [...done.steps, ...moved.steps],
            chain: passedStep(done.chain, back, moved.map),
          };
    },
    { steps: [], chain },
  );

export const rebaseSteps = (
  steps: readonly Step[],
  chain: MirrorMaps,
  accept?: (moved: Step) => boolean,
  docs?: RebaseDocs,
): RebasedSteps => {
  const removed: RemovedNodes = new Map();

  return rebasedWith(steps, chain, (step, behind, index) => {
    const moved = movedStep(step, behind, index, docs, removed);

    return moved === undefined || accept?.(moved) === false ? NOTHING : single(moved);
  });
};

export const rebaseHistory = (steps: readonly Step[], chain: MirrorMaps): RebasedSteps =>
  rebasedWith(steps, chain, (step, behind) => {
    const mapper = mirrored(behind);

    if (isRemoval(step)) {
      return removalsOf(step, mapper);
    }
    const moved = mapStep(step, mapper);

    return moved === undefined || idle(moved) ? NOTHING : single(moved);
  });
