import { contentSize, nodeSize, sameAttrs, sameMarks } from '../model/node';
import {
  ContentNodeKind,
  type ContentNode,
  type ElementNode,
  type NodeId,
} from '../model/node.types';
import { StepKind, type Step, type StepSpan } from '../transform/step.types';
import type { Transform } from '../transform/transform.types';

interface Edit {
  readonly from: number;
  to: number;
  readonly removed: ContentNode[];
  readonly inserted: ContentNode[];
}

type Pair = readonly [ElementNode, ElementNode];

export const EMPTY_SLICE = { content: [], openStart: 0, openEnd: 0 } as const;

const childIds = (content: readonly ContentNode[]): Set<NodeId> =>
  content.reduce((ids, node) => {
    if (node.kind === ContentNodeKind.Element) {
      ids.add(node.id);
    }
    return ids;
  }, new Set<NodeId>());

const pairOf = (left: ContentNode | undefined, right: ContentNode | undefined): Pair | undefined =>
  left?.kind === ContentNodeKind.Element &&
  right?.kind === ContentNodeKind.Element &&
  left.id === right.id &&
  left.type === right.type &&
  sameAttrs(left.attrs, right.attrs)
    ? [left, right]
    : undefined;

const stays = (
  left: ContentNode,
  right: ContentNode | undefined,
  kept: ReadonlySet<NodeId>,
): boolean =>
  right !== undefined &&
  left.kind === ContentNodeKind.Element &&
  kept.has(left.id) &&
  (right.kind !== ContentNodeKind.Element || right.id !== left.id);

const editAt = (edits: Edit[], pos: number): Edit => {
  const last = edits.at(-1);

  if (last?.to === pos) {
    return last;
  }
  const edit: Edit = { from: pos, to: pos, removed: [], inserted: [] };

  edits.push(edit);
  return edit;
};

const collect = (before: ElementNode, after: ElementNode, start: number, edits: Edit[]): void => {
  const kept = childIds(after.content);
  let pos = start;
  let old = 0;
  let next = 0;

  while (old < before.content.length || next < after.content.length) {
    const left = before.content[old];
    const right = after.content[next];
    const pair = left === right ? undefined : pairOf(left, right);

    if (left !== undefined && (left === right || pair !== undefined)) {
      if (pair !== undefined) {
        collect(pair[0], pair[1], pos + 1, edits);
      }
      pos += nodeSize(left);
      old += 1;
      next += 1;
      continue;
    }

    const edit = editAt(edits, pos);

    if (left !== undefined && !stays(left, right, kept)) {
      edit.removed.push(left);
      edit.to += nodeSize(left);
      pos += nodeSize(left);
      old += 1;
      continue;
    }
    if (right !== undefined) {
      edit.inserted.push(right);
    }
    next += 1;
  }
};

const placeOf = (
  nodes: readonly ContentNode[],
  start: number,
  wanted: ContentNode,
): number | undefined => {
  let pos = start;

  for (const node of nodes) {
    const inner =
      node === wanted || node.kind !== ContentNodeKind.Element
        ? undefined
        : placeOf(node.content, pos + 1, wanted);

    if (node === wanted || inner !== undefined) {
      return inner ?? pos;
    }
    pos += nodeSize(node);
  }
  return undefined;
};

const gapOf = (edit: Edit): StepSpan | undefined => {
  const [first] = edit.inserted;
  const from = first === undefined ? undefined : placeOf(edit.removed, edit.from, first);

  return from === undefined ? undefined : { from, to: from + contentSize(edit.inserted) };
};

const holds = (node: ContentNode, ids: ReadonlySet<NodeId>): boolean =>
  node.kind === ContentNodeKind.Element &&
  (ids.has(node.id) || node.content.some((child) => holds(child, ids)));

const gather = (node: ContentNode, ids: Set<NodeId>): void => {
  if (node.kind !== ContentNodeKind.Element) {
    return;
  }
  ids.add(node.id);

  for (const child of node.content) {
    gather(child, ids);
  }
};

const removedIds = (edit: Edit): Set<NodeId> => {
  const ids = new Set<NodeId>();

  for (const node of edit.removed) {
    gather(node, ids);
  }
  return ids;
};

const ordered = (edits: readonly Edit[]): Edit[] => {
  const gone = edits.map(removedIds);

  const waits = (edit: Edit, index: number): boolean =>
    gone.some(
      (ids, other) => other !== index && ids.size > 0 && edit.inserted.some((n) => holds(n, ids)),
    );

  return edits
    .reduce<[Edit[], Edit[]]>(
      (groups, edit, index) => {
        groups[waits(edit, index) ? 1 : 0].push(edit);
        return groups;
      },
      [[], []],
    )
    .flat();
};

const stepsOf = (edit: Edit, shift: number): Step[] => {
  const from = edit.from + shift;
  const to = edit.to + shift;
  const gap = gapOf(edit);

  const written: Step = {
    kind: StepKind.Replace,
    from,
    to,
    slice: { content: edit.inserted, openStart: 0, openEnd: 0 },
  };

  return gap === undefined
    ? [written]
    : [
        {
          kind: StepKind.ReplaceAround,
          from,
          to,
          gapFrom: gap.from + shift,
          gapTo: gap.to + shift,
          slice: EMPTY_SLICE,
          insert: 0,
        },
        written,
      ];
};

export const applyEdits = (work: Transform, after: ElementNode): boolean => {
  const edits: Edit[] = [];
  const base = work.steps.length;

  collect(work.doc.root, after, 0, edits);

  return ordered(edits).every((edit) => {
    const shift = work.mapping.slice(base).map(edit.from, 1) - edit.from;

    return stepsOf(edit, shift).some((step) => work.maybeStep(step).ok);
  });
};

export const sameTree = (left: ContentNode, right: ContentNode): boolean => {
  if (left === right) {
    return true;
  }
  if (left.kind === ContentNodeKind.Text) {
    return (
      right.kind === ContentNodeKind.Text &&
      left.text === right.text &&
      sameMarks(left.marks, right.marks)
    );
  }
  return (
    pairOf(left, right) !== undefined &&
    right.kind === ContentNodeKind.Element &&
    left.content.length === right.content.length &&
    left.content.every((child, index) => {
      const other = right.content[index];

      return other !== undefined && sameTree(child, other);
    })
  );
};
