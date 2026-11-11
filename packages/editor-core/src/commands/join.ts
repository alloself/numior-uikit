import type { Doc, ResolvedPos } from '../doc/doc.types';
import { nodeSize } from '../model/node';
import { ContentNodeKind, type ContentNode, type ElementNode } from '../model/node.types';
import type { Schema } from '../schema/schema.types';
import { textSelection } from '../state/selection';
import type { Command, Dispatch, EditorState, Transaction } from '../state/state.types';
import { attempt } from './attempt';
import { isAtom } from './atoms';
import { textCursor } from './cursor';

type Side = -1 | 1;

interface Leaf {
  readonly node: ElementNode;
  readonly pos: number;
}

interface Removal {
  readonly from: number;
  readonly to: number;
  readonly fill: readonly ContentNode[];
}

const EMPTY_SLICE = { content: [], openStart: 0, openEnd: 0 } as const;

const isLeaf = (schema: Schema, node: ElementNode): boolean =>
  schema.nodes.get(node.type)?.inlineContent === true || isAtom(schema, node);

export const concealed = (state: EditorState, parent: ElementNode, index: number): boolean =>
  state.plugins.some((plugin) => plugin.props.conceals?.(parent, index, state) === true);

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
    const shown = !concealed(state, parent, index);

    if (shown && isLeaf(state.doc.schema, child)) {
      return { node: child, pos };
    }

    const leaf = shown
      ? leafFrom(
          state,
          child,
          side > 0 ? 0 : child.content.length - 1,
          side > 0 ? pos + 1 : pos + size - 1,
          side,
        )
      : undefined;

    if (leaf !== undefined) {
      return leaf;
    }
    at += side * size;
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

const spliced = (
  parent: ElementNode,
  index: number,
  content: readonly ContentNode[],
): ContentNode[] => [
  ...parent.content.slice(0, index),
  ...content,
  ...parent.content.slice(index + 1),
];

const fits = (schema: Schema, parent: ElementNode, content: readonly ContentNode[]): boolean =>
  content.length > 0 &&
  schema.nodes.get(parent.type)?.content.matchContent(content)?.validEnd === true;

const unwrapped = (nodes: readonly ContentNode[]): ContentNode[] =>
  nodes.flatMap((node) => (node.kind === ContentNodeKind.Element ? node.content : [node]));

const removalOf = (doc: Doc, pos: number): Removal | undefined => {
  const inside = doc.resolve(pos + 1);
  let fill: readonly ContentNode[] = [];

  for (let depth = inside.depth - 1; depth >= 0; depth -= 1) {
    const parent = inside.node(depth);
    const index = inside.indexAt(depth);

    const found = [fill, unwrapped(fill)].find((content) =>
      fits(doc.schema, parent, spliced(parent, index, content)),
    );

    if (found !== undefined) {
      return { from: inside.before(depth + 1), to: inside.after(depth + 1), fill: found };
    }
    fill = spliced(parent, index, fill);
  }
  return undefined;
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
  tr.replace(removal.from, removal.to, { content: removal.fill, openStart: 0, openEnd: 0 });
  return true;
};

const joinLeaves = (
  state: EditorState,
  left: Leaf,
  right: Leaf,
  dispatch: Dispatch | undefined,
): boolean =>
  attempt(state, dispatch, (tr) => {
    const content = flowed(state.doc, left.node, right);
    const start = removed(tr, state.doc, right.pos) ? tr.doc.positionOf(left.node.id) : undefined;

    if (start === undefined) {
      return false;
    }
    const end = start + nodeSize(left.node) - 1;

    if (content.length > 0) {
      tr.insert(end, content);
    }
    tr.setSelection(textSelection(end));
    return true;
  });

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
