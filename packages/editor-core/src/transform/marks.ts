import { createDoc } from '../doc/doc';
import type { Doc } from '../doc/doc.types';
import { childIndexAt, childOffsets, sameMarks, spliceContent } from '../model/node';
import {
  ContentNodeKind,
  type ContentNode,
  type ElementNode,
  type Mark,
  type TextNode,
} from '../model/node.types';
import type { Schema } from '../schema/schema.types';
import type { StepResult, StepSpan } from './step.types';

type MarkChange = (marks: readonly Mark[]) => readonly Mark[];

interface MarkTask {
  readonly schema: Schema;
  readonly from: number;
  readonly to: number;
  readonly type: string;
  readonly change: MarkChange;
  readonly skip: readonly StepSpan[];
}

interface Cut {
  readonly from: number;
  readonly to: number;
  readonly changed: boolean;
}

const sameMark = (left: Mark, right: Mark): boolean => sameMarks([left], [right]);

const firstSpanAfter = (spans: readonly StepSpan[], pos: number): number => {
  let low = 0;
  let high = spans.length;

  while (low < high) {
    const middle = (low + high) >> 1;

    if ((spans[middle]?.to ?? 0) <= pos) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
};

const cutsOf = (skip: readonly StepSpan[], from: number, to: number): Cut[] => {
  const cuts: Cut[] = [];
  let cursor = from;

  for (let index = firstSpanAfter(skip, from); index < skip.length; index += 1) {
    const span = skip[index];

    if (span === undefined || span.from >= to) {
      break;
    }
    const start = Math.max(span.from, cursor);
    const end = Math.min(span.to, to);

    if (start > cursor) {
      cuts.push({ from: cursor, to: start, changed: true });
    }
    cuts.push({ from: start, to: end, changed: false });
    cursor = end;
  }
  if (cursor < to) {
    cuts.push({ from: cursor, to, changed: true });
  }
  return cuts;
};

const splitAt = (node: TextNode, start: number, task: MarkTask): ContentNode[] => {
  const from = Math.max(task.from, start);
  const to = Math.min(task.to, start + node.text.length);
  const marks = task.change(node.marks);

  if (sameMarks(marks, node.marks) || from >= to) {
    return [node];
  }
  return [
    { ...node, text: node.text.slice(0, from - start) },
    ...cutsOf(task.skip, from, to).map((cut) => ({
      ...node,
      text: node.text.slice(cut.from - start, cut.to - start),
      marks: cut.changed ? marks : node.marks,
    })),
    { ...node, text: node.text.slice(to - start) },
  ];
};

const markChild = (
  child: ContentNode,
  childStart: number,
  allowed: boolean,
  task: MarkTask,
): ContentNode[] => {
  if (child.kind === ContentNodeKind.Text) {
    return allowed ? splitAt(child, childStart, task) : [child];
  }
  return [child.leaf ? child : markNode(child, childStart + 1, task)];
};

const markNode = (node: ElementNode, start: number, task: MarkTask): ElementNode => {
  const offsets = childOffsets(node);
  const allowed = task.schema.nodes.get(node.type)?.marks.has(task.type) === true;
  const first = childIndexAt(node, Math.max(0, task.from - start));
  const touched: ContentNode[] = [];
  let last = first;
  let changed = false;

  for (; last < node.content.length; last += 1) {
    const child = node.content[last];
    const childStart = start + (offsets[last] ?? 0);

    if (child === undefined || childStart >= task.to) {
      break;
    }
    const parts = markChild(child, childStart, allowed, task);

    changed ||= parts.length !== 1 || parts[0] !== child;
    touched.push(...parts);
  }
  return changed ? spliceContent(node, first, last, touched) : node;
};

const rankedAdd = (schema: Schema, mark: Mark): MarkChange => {
  const rank = (item: Mark): number => schema.marks.get(item.type)?.rank ?? 0;

  return (marks) =>
    [...marks.filter((item) => item.type !== mark.type), mark].toSorted(
      (left, right) => rank(left) - rank(right),
    );
};

export const applyMark = (
  doc: Doc,
  from: number,
  to: number,
  mark: Mark,
  add: boolean,
  skip: readonly StepSpan[] = [],
): StepResult => {
  if (from < 0 || to > doc.size || from >= to || !doc.schema.marks.has(mark.type)) {
    return { ok: false, reason: 'range' };
  }

  const change: MarkChange = add
    ? rankedAdd(doc.schema, mark)
    : (marks) => marks.filter((item) => !sameMark(item, mark));

  const root = markNode(doc.root, 0, {
    schema: doc.schema,
    from,
    to,
    type: mark.type,
    change,
    skip,
  });

  return { ok: true, doc: root === doc.root ? doc : createDoc(doc.schema, root) };
};

export const heldSpans = (
  doc: Doc,
  from: number,
  to: number,
  mark: Mark,
  held: boolean,
): StepSpan[] => {
  const spans: StepSpan[] = [];
  let open = false;

  doc.nodesBetween(from, to, (node, pos, parent) => {
    if (
      node.kind !== ContentNodeKind.Text ||
      doc.schema.nodes.get(parent.type)?.marks.has(mark.type) !== true
    ) {
      return true;
    }
    const start = Math.max(from, pos);
    const end = Math.min(to, pos + node.text.length);
    const last = spans.at(-1);

    if (node.marks.some((item) => sameMark(item, mark)) !== held) {
      open = false;
    } else if (open && last !== undefined) {
      spans[spans.length - 1] = { from: last.from, to: end };
    } else {
      spans.push({ from: start, to: end });
      open = true;
    }
    return true;
  });

  return spans;
};
