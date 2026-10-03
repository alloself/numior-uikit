import { createDoc } from '../doc/doc';
import type { Doc } from '../doc/doc.types';
import { childOffsets, nodeSize, sameMarks, withContent } from '../model/node';
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

const markNode = (node: ElementNode, start: number, task: MarkTask): ElementNode => {
  const offsets = childOffsets(node);
  const allowed = task.schema.nodes.get(node.type)?.marks.has(task.type) === true;
  let changed = false;

  const content = node.content.flatMap((child, index): ContentNode[] => {
    const childStart = start + (offsets[index] ?? 0);

    if (childStart + nodeSize(child) <= task.from || childStart >= task.to) {
      return [child];
    }
    if (child.kind === 'text') {
      const parts = allowed ? splitAt(child, childStart, task) : [child];

      changed ||= parts.length > 1;
      return parts;
    }
    const next = child.leaf ? child : markNode(child, childStart + 1, task);

    changed ||= next !== child;
    return [next];
  });

  return changed ? withContent(node, content) : node;
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
