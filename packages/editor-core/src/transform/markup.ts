import { createDoc } from '../doc/doc';
import type { Doc } from '../doc/doc.types';
import { childOffsets, nodeSize } from '../model/node';
import { ContentNodeKind, type ContentNode, type ElementNode } from '../model/node.types';
import type { Schema } from '../schema/schema.types';
import { validAttrs } from './attrs';
import { fits } from './replace';
import type { MarkupChange, StepFailure, StepResult } from './step.types';

type Retyped =
  | { readonly ok: true; readonly node: ElementNode; readonly retyped: boolean }
  | { readonly ok: false; readonly reason: StepFailure };

const failed = (reason: StepFailure): Retyped => ({ ok: false, reason });

const ownChange = (
  schema: Schema,
  child: ElementNode,
  change: MarkupChange | undefined,
): Retyped => {
  if (change === undefined) {
    return { ok: true, node: child, retyped: false };
  }
  if (!validAttrs(schema.nodes.get(change.type)?.attrs, change.attrs)) {
    return failed(schema.nodes.has(change.type) ? 'attrs' : 'target');
  }

  const node: ElementNode = { ...child, type: change.type, attrs: change.attrs };

  return { ok: true, node, retyped: node.type !== child.type };
};

const nextOutside = (changes: readonly MarkupChange[], from: number, end: number): number => {
  let next = from;

  while (next < changes.length && (changes[next]?.pos ?? end) < end) {
    next += 1;
  }
  return next;
};

const retypeChild = (
  schema: Schema,
  child: ContentNode,
  start: number,
  inside: readonly MarkupChange[],
): Retyped => {
  const first = inside[0];

  if (child.kind !== ContentNodeKind.Element || first === undefined || first.pos < start) {
    return failed('target');
  }

  const own = ownChange(schema, child, first.pos === start ? first : undefined);
  const nested = inside.filter((change) => change.pos > start);

  if (!own.ok) {
    return own;
  }

  const result = nested.length === 0 ? own : retype(schema, own.node, start + 1, nested);

  if (!result.ok) {
    return result;
  }
  return own.retyped && !fits(schema, result.node)
    ? failed('content')
    : { ok: true, node: result.node, retyped: own.retyped };
};

const retype = (
  schema: Schema,
  node: ElementNode,
  start: number,
  changes: readonly MarkupChange[],
): Retyped => {
  const offsets = childOffsets(node);
  const content: ContentNode[] = [...node.content];
  let next = 0;
  let retypedChild = false;

  for (const [index, child] of node.content.entries()) {
    const childStart = start + (offsets[index] ?? 0);
    const first = next;

    next = nextOutside(changes, next, childStart + nodeSize(child));

    if (first === next) {
      continue;
    }

    const result = retypeChild(schema, child, childStart, changes.slice(first, next));

    if (!result.ok) {
      return result;
    }
    content[index] = result.node;
    retypedChild ||= result.retyped;
  }

  if (next < changes.length) {
    return failed('target');
  }

  const rebuilt: ElementNode = { ...node, content };

  return retypedChild && !fits(schema, rebuilt)
    ? failed('content')
    : { ok: true, node: rebuilt, retyped: false };
};

export const applyMarkup = (doc: Doc, changes: readonly MarkupChange[]): StepResult => {
  const sorted = changes.toSorted((left, right) => left.pos - right.pos);

  const outside = sorted.some(
    (change, index) =>
      change.pos < 0 || change.pos >= doc.size || change.pos === sorted[index - 1]?.pos,
  );

  if (sorted.length === 0 || outside) {
    return { ok: false, reason: 'range' };
  }

  const result = retype(doc.schema, doc.root, 0, sorted);

  return result.ok ? { ok: true, doc: createDoc(doc.schema, result.node) } : result;
};

export const markupBefore = (doc: Doc, changes: readonly MarkupChange[]): MarkupChange[] =>
  changes.flatMap((change) => {
    const target = doc.nodeAt(change.pos);

    return target?.kind === ContentNodeKind.Element
      ? [{ pos: change.pos, type: target.type, attrs: target.attrs }]
      : [];
  });
