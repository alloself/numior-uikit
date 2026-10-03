import { createDoc } from '../doc/doc';
import type { Doc, Slice } from '../doc/doc.types';
import { sharedDepth } from '../doc/resolve';
import { childOffsets, contentSize, nodeSize, spliceContent } from '../model/node';
import type { ElementNode, NodeId } from '../model/node.types';
import { checkNodes } from '../schema/check';
import type { Schema } from '../schema/schema.types';
import type { StepResult } from './step.types';
import { contentTokens, cutTokens, rebuild, sliceFrame, sliceTokens, type Token } from './tokens';
import { liftInto } from './tree';

interface Region {
  readonly first: number;
  readonly last: number;
  readonly start: number;
}

export interface ReplacePlan {
  readonly from: number;
  readonly to: number;
  readonly middle: readonly Token[];
  readonly inserted: readonly Token[];
  readonly openStart: number;
  readonly openEnd: number;
  readonly freed: (pos: number) => boolean;
}

export const sliceSize = (slice: Slice): number =>
  contentSize(slice.content) - slice.openStart - slice.openEnd;

const failed = (reason: 'range' | 'depth' | 'content' | 'id'): StepResult => ({
  ok: false,
  reason,
});

const regionOf = (node: ElementNode, start: number, from: number, to: number): Region => {
  const offsets = childOffsets(node);
  let first = -1;
  let last = -1;

  node.content.forEach((child, index) => {
    const childStart = start + (offsets[index] ?? 0);
    const childEnd = childStart + nodeSize(child);

    const overlaps =
      from === to ? childStart < from && childEnd > from : childEnd > from && childStart < to;

    if (overlaps) {
      first = first < 0 ? index : first;
      last = index + 1;
    }
  });

  if (first >= 0) {
    return { first, last, start: start + (offsets[first] ?? 0) };
  }
  const index = offsets.filter((offset) => start + offset < from).length;

  return { first: index, last: index, start: from };
};

const allowedText = (schema: Schema, node: ElementNode): boolean => {
  const type = schema.nodes.get(node.type);

  return node.content.every(
    (child) =>
      child.kind === 'element' || child.marks.every((mark) => type?.marks.has(mark.type) === true),
  );
};

const fits = (schema: Schema, node: ElementNode): boolean =>
  schema.nodes.get(node.type)?.content.matchContent(node.content)?.validEnd === true &&
  allowedText(schema, node);

const collectIds = (node: ElementNode, into: NodeId[]): void => {
  into.push(node.id);

  for (const child of node.content) {
    if (child.kind === 'element') {
      collectIds(child, into);
    }
  }
};

const insertedIds = (tokens: readonly Token[]): NodeId[] => {
  const ids: NodeId[] = [];

  for (const token of tokens) {
    if (token.kind === 'open') {
      ids.push(token.node.id);
    } else if (token.kind === 'node') {
      collectIds(token.node, ids);
    }
  }
  return ids;
};

const idsFree = (doc: Doc, plan: ReplacePlan): boolean => {
  const ids = insertedIds(plan.inserted);
  const unique = new Set(ids);

  return (
    unique.size === ids.length &&
    ids.every((id) => {
      const pos = doc.positionOf(id);

      return id !== doc.root.id && (pos === undefined || plan.freed(pos));
    })
  );
};

const middleNodes = (tokens: readonly Token[]): ElementNode[] =>
  tokens.flatMap((token) => (token.kind === 'node' ? [token.node] : []));

export const applyPlan = (doc: Doc, plan: ReplacePlan): StepResult => {
  const { from, to } = plan;

  if (from < 0 || to > doc.size || from > to) {
    return failed('range');
  }
  const left = doc.resolve(from);
  const right = doc.resolve(to);
  const depth = left.depth - plan.openStart;

  if (depth < 0 || depth !== right.depth - plan.openEnd) {
    return failed('depth');
  }
  if (!checkNodes(doc.schema, middleNodes(plan.inserted)).ok) {
    return failed('content');
  }
  if (!idsFree(doc, plan)) {
    return failed('id');
  }
  const base = Math.min(depth, sharedDepth(left, right));
  const node = left.node(base);
  const region = regionOf(node, left.start(base), from, to);

  const tokens = contentTokens(node.content.slice(region.first, region.last), region.start, [
    from,
    to,
  ]);

  const [before, rest] = cutTokens(tokens, from - region.start);
  const [, after] = cutTokens(rest, to - from);
  const built = rebuild([...before, ...plan.middle, ...after]);

  if (built === undefined) {
    return failed('depth');
  }

  const next = spliceContent(node, region.first, region.last, built.content);

  if (![next, ...built.rebuilt].every((element) => fits(doc.schema, element))) {
    return failed('content');
  }
  return { ok: true, doc: createDoc(doc.schema, liftInto(left, base, next)) };
};

export const replacePlan = (from: number, to: number, slice: Slice): ReplacePlan | undefined => {
  const middle = sliceTokens(slice.content, slice.openStart, slice.openEnd);

  return middle === undefined
    ? undefined
    : {
        from,
        to,
        middle,
        inserted: middle,
        openStart: slice.openStart,
        openEnd: slice.openEnd,
        freed: (pos) => pos >= from && pos < to,
      };
};

export const aroundPlan = (
  doc: Doc,
  step: {
    readonly from: number;
    readonly to: number;
    readonly gapFrom: number;
    readonly gapTo: number;
    readonly slice: Slice;
    readonly insert: number;
  },
): ReplacePlan | undefined => {
  const { from, to, gapFrom, gapTo, slice, insert } = step;
  const middle = sliceFrame(slice.content, slice.openStart, slice.openEnd, [insert])?.inner;

  if (
    middle === undefined ||
    from < 0 ||
    to > doc.size ||
    gapFrom < from ||
    gapTo > to ||
    gapFrom > gapTo ||
    insert > sliceSize(slice)
  ) {
    return undefined;
  }
  const gap = doc.slice(gapFrom, gapTo);

  if (gap.openStart > 0 || gap.openEnd > 0) {
    return undefined;
  }
  const [head, tail] = cutTokens(middle, insert);

  return {
    from,
    to,
    middle: [...head, ...contentTokens(gap.content, gapFrom, []), ...tail],
    inserted: [...head, ...tail],
    openStart: slice.openStart,
    openEnd: slice.openEnd,
    freed: (pos) => (pos >= from && pos < gapFrom) || (pos >= gapTo && pos < to),
  };
};
