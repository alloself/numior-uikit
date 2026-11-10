import { createDoc } from '../doc/doc';
import type { Doc, Slice } from '../doc/doc.types';
import { sharedDepth } from '../doc/resolve';
import { childIndexAt, childOffsets, contentSize, spliceContent } from '../model/node';
import {
  ContentNodeKind,
  type ContentNode,
  type ElementNode,
  type NodeId,
} from '../model/node.types';
import { checkNodes } from '../schema/check';
import { matchesSplice } from '../schema/content-match';
import type { NodeType, Schema } from '../schema/schema.types';
import { validAttrs } from './attrs';
import { TokenKind, type StepResult } from './step.types';
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
  const first = childIndexAt(node, from - start);
  const firstStart = start + (offsets[first] ?? 0);

  if (first >= node.content.length || (from === to && firstStart >= from)) {
    return { first, last: first, start: from };
  }
  if (from === to) {
    return { first, last: first + 1, start: firstStart };
  }

  const end = childIndexAt(node, to - start);
  const last = end < node.content.length && start + (offsets[end] ?? 0) < to ? end + 1 : end;

  return { first, last, start: firstStart };
};

const allowedText = (
  schema: Schema,
  type: NodeType | undefined,
  content: readonly ContentNode[],
): boolean =>
  content.every(
    (child) =>
      child.kind === ContentNodeKind.Element ||
      child.marks.every(
        (mark) =>
          type?.marks.has(mark.type) === true &&
          validAttrs(schema.marks.get(mark.type)?.attrs, mark.attrs),
      ),
  );

export const fits = (schema: Schema, node: ElementNode): boolean => {
  const type = schema.nodes.get(node.type);

  return (
    type?.content.matchContent(node.content)?.validEnd === true &&
    allowedText(schema, type, node.content)
  );
};

const fitsEdited = (
  schema: Schema,
  before: ElementNode,
  after: ElementNode,
  region: Region,
): boolean => {
  const type = schema.nodes.get(after.type);

  if (type === undefined) {
    return fits(schema, after);
  }

  const prefix = Math.max(0, region.first - 1);
  const suffix = before.content.length - Math.min(before.content.length, region.last + 1);
  const inserted = after.content.slice(prefix, after.content.length - suffix);

  return (
    matchesSplice(type.content, before, prefix, before.content.length - suffix, inserted) &&
    allowedText(schema, type, inserted)
  );
};

const collectIds = (node: ElementNode, into: NodeId[]): void => {
  into.push(node.id);

  for (const child of node.content) {
    if (child.kind === ContentNodeKind.Element) {
      collectIds(child, into);
    }
  }
};

const insertedIds = (tokens: readonly Token[]): NodeId[] => {
  const ids: NodeId[] = [];

  for (const token of tokens) {
    if (token.kind === TokenKind.Open) {
      ids.push(token.node.id);
    } else if (token.kind === TokenKind.Node) {
      collectIds(token.node, ids);
    }
  }
  return ids;
};

const idsFree = (doc: Doc, plan: ReplacePlan, fresh: ReadonlySet<NodeId>): boolean => {
  const ids = insertedIds(plan.inserted);
  const unique = new Set(ids);

  return (
    unique.size === ids.length &&
    ids.every((id) => {
      if (fresh.has(id)) {
        return true;
      }

      const pos = doc.positionOf(id);

      return id !== doc.root.id && (pos === undefined || plan.freed(pos));
    })
  );
};

const middleNodes = (tokens: readonly Token[]): ElementNode[] =>
  tokens.flatMap((token) => (token.kind === TokenKind.Node ? [token.node] : []));

export const applyPlan = (doc: Doc, plan: ReplacePlan, fresh: ReadonlySet<NodeId>): StepResult => {
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
  if (!idsFree(doc, plan, fresh)) {
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

  if (
    !fitsEdited(doc.schema, node, next, region) ||
    !built.rebuilt.every((element) => fits(doc.schema, element))
  ) {
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
