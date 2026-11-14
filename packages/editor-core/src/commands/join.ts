import { sumBy } from 'lodash-es';
import type { Doc, ResolvedPos } from '../doc/doc.types';
import { childOffsets, nodeSize } from '../model/node';
import { ContentNodeKind, type ContentNode, type ElementNode } from '../model/node.types';
import type { Schema } from '../schema/schema.types';
import { textSelection } from '../state/selection';
import type { Command, Dispatch, EditorState, Transaction } from '../state/state.types';
import { StepKind, type StepSpan } from '../transform/step.types';
import { attempt } from './attempt';
import { isAtom } from './atoms';
import { textCursor } from './cursor';
import { EMPTY_SLICE } from './tree-edits';

type Side = -1 | 1;

interface Leaf {
  readonly node: ElementNode;
  readonly pos: number;
}

interface Kept {
  readonly node: ContentNode;
  readonly pos: number;
}

interface Removal {
  readonly from: number;
  readonly to: number;
  readonly fill: readonly Kept[];
}

const isLeaf = (schema: Schema, node: ElementNode): boolean =>
  schema.nodes.get(node.type)?.inlineContent === true || isAtom(schema, node);

export const concealed = (state: EditorState, parent: ElementNode, index: number): boolean =>
  state.plugins.some((plugin) => plugin.props.conceals?.(parent, index, state) === true);

const innerEdge = (child: ElementNode, pos: number, size: number, side: Side): [number, number] =>
  side > 0 ? [0, pos + 1] : [child.content.length - 1, pos + size - 1];

const leafFrom = (
  state: EditorState,
  parent: ElementNode,
  start: number,
  edge: number,
  side: Side,
): Leaf | undefined => {
  let at = edge;

  for (let index = start; index >= 0 && index < parent.content.length; index += side) {
    const child = parent.content[index];

    if (child?.kind !== ContentNodeKind.Element) {
      return undefined;
    }

    const size = nodeSize(child);
    const pos = side > 0 ? at : at - size;

    at += side * size;
    if (concealed(state, parent, index)) {
      continue;
    }
    if (isLeaf(state.doc.schema, child)) {
      return { node: child, pos };
    }

    const leaf = leafFrom(state, child, ...innerEdge(child, pos, size, side), side);

    if (leaf !== undefined) {
      return leaf;
    }
  }
  return undefined;
};

const adjacentLeaf = (state: EditorState, cursor: ResolvedPos, side: Side): Leaf | undefined => {
  for (let depth = cursor.depth - 1; depth >= 0; depth -= 1) {
    const leaf = leafFrom(
      state,
      cursor.node(depth),
      cursor.indexAt(depth) + side,
      side > 0 ? cursor.after(depth + 1) : cursor.before(depth + 1),
      side,
    );

    if (leaf !== undefined) {
      return leaf;
    }
  }
  return undefined;
};

const placed = (parent: ElementNode, start: number): Kept[] => {
  const offsets = childOffsets(parent);

  return parent.content.map((node, index) => ({ node, pos: start + (offsets[index] ?? 0) }));
};

const around = (
  parent: ElementNode,
  start: number,
  index: number,
  inner: readonly Kept[],
): Kept[] => {
  const all = placed(parent, start);

  return [...all.slice(0, index), ...inner, ...all.slice(index + 1)];
};

const opened = (kept: readonly Kept[]): Kept[] =>
  kept.flatMap((entry) =>
    entry.node.kind === ContentNodeKind.Element ? placed(entry.node, entry.pos + 1) : [entry],
  );

const nodesOf = (kept: readonly Kept[]): ContentNode[] => kept.map((entry) => entry.node);

const fits = (schema: Schema, parent: ElementNode, content: readonly ContentNode[]): boolean =>
  content.length > 0 &&
  schema.nodes.get(parent.type)?.content.matchContent(content)?.validEnd === true;

const removalOf = (doc: Doc, pos: number): Removal | undefined => {
  const inside = doc.resolve(pos + 1);
  let fill: readonly Kept[] = [];

  for (let depth = inside.depth - 1; depth >= 0; depth -= 1) {
    const parent = inside.node(depth);
    const start = inside.start(depth);
    const index = inside.indexAt(depth);

    const found = [fill, opened(fill)].find((content) =>
      fits(doc.schema, parent, nodesOf(around(parent, start, index, content))),
    );

    if (found !== undefined) {
      return { from: inside.before(depth + 1), to: inside.after(depth + 1), fill: found };
    }
    fill = around(parent, start, index, fill);
  }
  return undefined;
};

const spanOf = (kept: readonly Kept[]): StepSpan | undefined => {
  const first = kept[0];
  const last = kept.at(-1);

  if (first === undefined || last === undefined) {
    return undefined;
  }
  const to = last.pos + nodeSize(last.node);

  return sumBy(kept, (entry) => nodeSize(entry.node)) === to - first.pos
    ? { from: first.pos, to }
    : undefined;
};

const flowed = (doc: Doc, into: ElementNode, from: Leaf): ContentNode[] => {
  const type = doc.schema.nodes.get(into.type);

  if (type?.code === true) {
    const text = doc.textBetween(from.pos + 1, from.pos + nodeSize(from.node) - 1, '');

    return text === '' ? [] : [doc.schema.text(text)];
  }
  return from.node.content.map((node) =>
    node.kind === ContentNodeKind.Text
      ? { ...node, marks: node.marks.filter((mark) => type?.marks.has(mark.type) === true) }
      : node,
  );
};

const removed = (tr: Transaction, doc: Doc, pos: number): boolean => {
  const removal = removalOf(doc, pos);

  if (removal === undefined) {
    return false;
  }
  const { from, to, fill } = removal;
  const gap = spanOf(fill);

  const lifted =
    gap !== undefined &&
    tr.maybeStep({
      kind: StepKind.ReplaceAround,
      from,
      to,
      gapFrom: gap.from,
      gapTo: gap.to,
      slice: EMPTY_SLICE,
      insert: 0,
    }).ok;

  if (!lifted) {
    tr.replace(from, to, { content: nodesOf(fill), openStart: 0, openEnd: 0 });
  }
  return true;
};

const stripped = (tr: Transaction, doc: Doc, into: ElementNode, from: Leaf): boolean => {
  const type = doc.schema.nodes.get(into.type);

  const texts = from.node.content.flatMap((node) =>
    node.kind === ContentNodeKind.Text ? [node] : [],
  );

  if (type?.code === true && texts.length < from.node.content.length) {
    return false;
  }

  const banned = new Set(
    texts.flatMap((node) =>
      node.marks.flatMap((mark) => (type?.marks.has(mark.type) === true ? [] : [mark.type])),
    ),
  );

  for (const mark of banned) {
    tr.removeMark(from.pos + 1, from.pos + nodeSize(from.node) - 1, mark);
  }
  return true;
};

const standsAlone = (doc: Doc, leaf: Leaf): boolean => {
  const removal = removalOf(doc, leaf.pos);

  return (
    removal?.fill.length === 0 &&
    removal.from === leaf.pos &&
    removal.to === leaf.pos + nodeSize(leaf.node)
  );
};

const pulledBeside = (tr: Transaction, doc: Doc, left: Leaf, right: Leaf): boolean => {
  const after = left.pos + nodeSize(left.node);
  const to = right.pos + nodeSize(right.node);

  return (
    standsAlone(doc, right) &&
    stripped(tr, doc, left.node, right) &&
    tr.maybeStep({ kind: StepKind.Move, from: right.pos, to, target: after }).ok &&
    tr.maybeStep({ kind: StepKind.Replace, from: after - 1, to: after + 1, slice: EMPTY_SLICE }).ok
  );
};

const pouredInto = (tr: Transaction, doc: Doc, left: Leaf, right: Leaf): boolean => {
  const from = right.pos + 1;
  const to = right.pos + nodeSize(right.node) - 1;
  const target = left.pos + nodeSize(left.node) - 1;

  if (
    !stripped(tr, doc, left.node, right) ||
    (from < to && !tr.maybeStep({ kind: StepKind.Move, from, to, target }).ok)
  ) {
    return false;
  }
  const emptied = tr.doc.positionOf(right.node.id);

  return emptied !== undefined && removed(tr, tr.doc, emptied);
};

const copiedInto = (tr: Transaction, doc: Doc, left: Leaf, right: Leaf): boolean => {
  const content = flowed(doc, left.node, right);

  if (!removed(tr, doc, right.pos)) {
    return false;
  }

  if (content.length > 0) {
    tr.insert(left.pos + nodeSize(left.node) - 1, content);
  }
  return true;
};

const JOINS = [pulledBeside, pouredInto, copiedInto] as const;

const joinLeaves = (
  state: EditorState,
  left: Leaf,
  right: Leaf,
  dispatch: Dispatch | undefined,
): boolean =>
  JOINS.some((join) =>
    attempt(state, dispatch, (tr) => {
      const start = join(tr, state.doc, left, right) ? tr.doc.positionOf(left.node.id) : undefined;

      if (start === undefined) {
        return false;
      }
      tr.setSelection(textSelection(start + nodeSize(left.node) - 1));
      return true;
    }),
  );

const leaveEmpty = (
  state: EditorState,
  own: Leaf,
  leaf: Leaf,
  side: Side,
  dispatch: Dispatch | undefined,
): boolean =>
  attempt(state, dispatch, (tr) => {
    const start = removed(tr, state.doc, own.pos) ? tr.doc.positionOf(leaf.node.id) : undefined;

    if (start === undefined) {
      return false;
    }
    tr.setSelection(textSelection(side < 0 ? start + nodeSize(leaf.node) - 1 : start + 1));
    return true;
  });

const joinSiblings = (
  state: EditorState,
  cursor: ResolvedPos,
  leaf: Leaf,
  side: Side,
  dispatch: Dispatch | undefined,
): boolean => {
  const boundary = side < 0 ? cursor.before(cursor.depth) : cursor.after(cursor.depth);
  const touching = side < 0 ? leaf.pos + nodeSize(leaf.node) === boundary : leaf.pos === boundary;
  const tr = state.tr;

  if (
    !touching ||
    !tr.maybeStep({ kind: 'replace', from: boundary - 1, to: boundary + 1, slice: EMPTY_SLICE }).ok
  ) {
    return false;
  }
  tr.setSelection(textSelection(side < 0 ? boundary - 1 : cursor.pos));
  dispatch?.(tr);
  return true;
};

const meetAtom = (
  state: EditorState,
  cursor: ResolvedPos,
  atom: ElementNode,
  side: Side,
  dispatch: Dispatch | undefined,
): boolean =>
  attempt(state, dispatch, (tr) => {
    const empty = cursor.parent.content.length === 0;

    if (empty && !removed(tr, state.doc, cursor.before(cursor.depth))) {
      return false;
    }

    tr.setSelection(
      empty
        ? { kind: 'gap', id: atom.id, side: side < 0 ? 'end' : 'start' }
        : { kind: 'node', id: atom.id },
    );

    return true;
  });

const atEdge = (cursor: ResolvedPos, side: Side): boolean =>
  side < 0 ? cursor.parentOffset === 0 : cursor.pos === cursor.end(cursor.depth);

const joinTowards = (state: EditorState, side: Side, dispatch: Dispatch | undefined): boolean => {
  const cursor = textCursor(state);

  if (cursor === undefined || cursor.depth === 0 || !atEdge(cursor, side)) {
    return false;
  }
  const leaf = adjacentLeaf(state, cursor, side);
  const own: Leaf = { node: cursor.parent, pos: cursor.before(cursor.depth) };

  if (leaf === undefined) {
    return false;
  }

  if (isAtom(state.doc.schema, leaf.node)) {
    return meetAtom(state, cursor, leaf.node, side, dispatch);
  }
  if (joinSiblings(state, cursor, leaf, side, dispatch)) {
    return true;
  }

  if (own.node.content.length === 0) {
    return leaveEmpty(state, own, leaf, side, dispatch);
  }
  return side < 0 ? joinLeaves(state, leaf, own, dispatch) : joinLeaves(state, own, leaf, dispatch);
};

export const joinBackward: Command = (state, dispatch) => joinTowards(state, -1, dispatch);

export const joinForward: Command = (state, dispatch) => joinTowards(state, 1, dispatch);
