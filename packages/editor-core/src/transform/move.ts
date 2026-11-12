import { createDoc } from '../doc/doc';
import type { Doc } from '../doc/doc.types';
import { sharedDepth } from '../doc/resolve';
import { spliceContent } from '../model/node';
import {
  StepMapKind,
  type Assoc,
  type MapResult,
  type MapSpan,
  type StepMap,
} from './mapping.types';
import { fits, fitsEdited, regionOf } from './replace';
import type { StepResult } from './step.types';
import { contentTokens, cutTokens, rebuild } from './tokens';
import { liftInto } from './tree';

export interface Swap {
  readonly low: number;
  readonly mid: number;
  readonly high: number;
}

const NO_RANGES: StepMap['ranges'] = [];

const kept = (pos: number): MapResult => ({
  pos,
  deleted: false,
  deletedBefore: false,
  deletedAfter: false,
  deletedAcross: false,
});

export const swapOf = (from: number, to: number, target: number): Swap =>
  target < from ? { low: target, mid: from, high: to } : { low: from, mid: to, high: target };

const placeIn = ({ low, mid, high }: Swap, pos: number, assoc: Assoc): number => {
  const head = mid - low;
  const tail = high - mid;

  if (pos < low || pos > high) {
    return pos;
  }
  if (pos === low) {
    return assoc < 0 ? low : low + tail;
  }
  if (pos < mid) {
    return pos + tail;
  }
  if (pos === mid) {
    return assoc < 0 ? high : low;
  }
  if (pos < high) {
    return pos - head;
  }
  return assoc < 0 ? low + tail : high;
};

const laneOfStart = ({ low, mid, high }: Swap, pos: number): number =>
  Number(pos >= low) + Number(pos >= mid) + Number(pos >= high);

const laneOfEnd = ({ low, mid, high }: Swap, pos: number): number =>
  Number(pos > low) + Number(pos > mid) + Number(pos > high);

const spanIn = (swap: Swap, from: number, to: number): MapSpan | undefined => {
  if (from >= to) {
    const at = kept(placeIn(swap, from, 1));

    return { from: at, to: at };
  }
  if (from <= swap.low && to >= swap.high) {
    return { from: kept(from), to: kept(to) };
  }
  return laneOfStart(swap, from) === laneOfEnd(swap, to)
    ? { from: kept(placeIn(swap, from, 1)), to: kept(placeIn(swap, to, -1)) }
    : undefined;
};

export const createMoveMap = (swap: Swap): StepMap => ({
  kind: StepMapKind.Move,
  ranges: NO_RANGES,
  map: (pos, assoc = 1) => placeIn(swap, pos, assoc),
  mapResult: (pos, assoc = 1) => kept(placeIn(swap, pos, assoc)),
  mapSpan: (from, to) => spanIn(swap, from, to),
  invert: () =>
    createMoveMap({ low: swap.low, mid: swap.low + swap.high - swap.mid, high: swap.high }),
});

export const applyMove = (doc: Doc, from: number, to: number, target: number): StepResult => {
  if (from < 0 || from >= to || to > doc.size || target < 0 || target > doc.size) {
    return { ok: false, reason: 'range' };
  }
  if (target >= from && target <= to) {
    return { ok: false, reason: 'range' };
  }
  const start = doc.resolve(from);
  const end = doc.resolve(to);

  if (start.depth !== end.depth || sharedDepth(start, end) !== start.depth) {
    return { ok: false, reason: 'depth' };
  }
  const { low, mid, high } = swapOf(from, to, target);
  const left = doc.resolve(low);
  const base = sharedDepth(left, doc.resolve(high));
  const node = left.node(base);
  const region = regionOf(node, left.start(base), low, high);

  const tokens = contentTokens(node.content.slice(region.first, region.last), region.start, [
    low,
    mid,
    high,
  ]);

  const [before, rest] = cutTokens(tokens, low - region.start);
  const [head, others] = cutTokens(rest, mid - low);
  const [tail, after] = cutTokens(others, high - mid);
  const built = rebuild([...before, ...tail, ...head, ...after]);

  if (built === undefined) {
    return { ok: false, reason: 'depth' };
  }
  const next = spliceContent(node, region.first, region.last, built.content);

  return fitsEdited(doc.schema, node, next, region) &&
    built.rebuilt.every((element) => fits(doc.schema, element))
    ? { ok: true, doc: createDoc(doc.schema, liftInto(left, base, next)) }
    : { ok: false, reason: 'content' };
};
