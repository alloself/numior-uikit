import { createDoc } from '../doc/doc';
import type { Doc } from '../doc/doc.types';
import { childIndexAt, childOffsets, sameMarks, spliceContent } from '../model/node';
import type { ContentNode, ElementNode, Mark, TextNode } from '../model/node.types';
import type { Schema } from '../schema/schema.types';
import type { StepResult } from './step.types';

type MarkChange = (marks: readonly Mark[]) => readonly Mark[];

interface MarkTask {
  readonly schema: Schema;
  readonly from: number;
  readonly to: number;
  readonly type: string;
  readonly change: MarkChange;
}

const sameMark = (left: Mark, right: Mark): boolean => sameMarks([left], [right]);

const splitAt = (node: TextNode, start: number, task: MarkTask): ContentNode[] => {
  const cutFrom = Math.max(task.from, start) - start;
  const cutTo = Math.min(task.to, start + node.text.length) - start;
  const marks = task.change(node.marks);

  if (sameMarks(marks, node.marks)) {
    return [node];
  }
  return [
    { ...node, text: node.text.slice(0, cutFrom) },
    { ...node, text: node.text.slice(cutFrom, cutTo), marks },
    { ...node, text: node.text.slice(cutTo) },
  ];
};

const markChild = (
  child: ContentNode,
  childStart: number,
  allowed: boolean,
  task: MarkTask,
): ContentNode[] => {
  if (child.kind === 'text') {
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
): StepResult => {
  if (from < 0 || to > doc.size || from >= to || !doc.schema.marks.has(mark.type)) {
    return { ok: false, reason: 'range' };
  }

  const change: MarkChange = add
    ? rankedAdd(doc.schema, mark)
    : (marks) => marks.filter((item) => !sameMark(item, mark));

  const root = markNode(doc.root, 0, { schema: doc.schema, from, to, type: mark.type, change });

  return { ok: true, doc: root === doc.root ? doc : createDoc(doc.schema, root) };
};
