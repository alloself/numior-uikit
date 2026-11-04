import type { ResolvedPos } from '../doc/doc.types';
import {
  ContentNodeKind,
  type AttrValue,
  type ContentNode,
  type ElementNode,
  type Mark,
} from '../model/node.types';
import type { Schema } from '../schema/schema.types';
import { isAtom } from './atoms';
import { isCursor, selectionRange, textSelection } from '../state/selection';
import {
  SelectionKind,
  type Command,
  type EditorState,
  type Transaction,
} from '../state/state.types';

interface JoinPlan {
  readonly cursor: ResolvedPos;
  readonly neighbour: ElementNode;
  readonly boundary: number;
}

const isTextblock = (schema: Schema, node: ContentNode | undefined): node is ElementNode =>
  node?.kind === ContentNodeKind.Element && schema.nodes.get(node.type)?.inlineContent === true;

const cursorOf = (state: EditorState): ResolvedPos | undefined =>
  state.selection.kind === SelectionKind.Text && isCursor(state.selection)
    ? state.doc.resolve(state.selection.head)
    : undefined;

export const chainCommands =
  (...commands: readonly Command[]): Command =>
  (state, dispatch) =>
    commands.some((command) => command(state, dispatch));

export const deleteSelection: Command = (state, dispatch) => {
  const range = selectionRange(state.doc, state.selection);

  if (range.from === range.to) {
    return false;
  }
  dispatch?.(state.tr.deleteSelection());
  return true;
};

export const selectAll: Command = (state, dispatch) => {
  dispatch?.(state.tr.setSelection({ kind: 'all' }));
  return true;
};

const sibling = (cursor: ResolvedPos, offset: -1 | 1): ElementNode | undefined => {
  const depth = cursor.depth - 1;
  const parent = depth >= 0 ? cursor.node(depth) : undefined;
  const node = parent?.content[cursor.indexAt(depth) + offset];

  return node?.kind === ContentNodeKind.Element ? node : undefined;
};

const atEdge = (cursor: ResolvedPos, offset: -1 | 1): boolean =>
  offset < 0 ? cursor.parentOffset === 0 : cursor.pos === cursor.end(cursor.depth);

const joinPlan = (state: EditorState, offset: -1 | 1): JoinPlan | undefined => {
  const cursor = cursorOf(state);

  if (cursor === undefined || cursor.depth === 0 || !atEdge(cursor, offset)) {
    return undefined;
  }
  const neighbour = sibling(cursor, offset);
  const boundary = offset < 0 ? cursor.before(cursor.depth) : cursor.after(cursor.depth);

  return neighbour === undefined ? undefined : { cursor, neighbour, boundary };
};

const EMPTY_SLICE = { content: [], openStart: 0, openEnd: 0 } as const;

const joinTowards = (
  state: EditorState,
  offset: -1 | 1,
  dispatch: Parameters<Command>[1],
): boolean => {
  const plan = joinPlan(state, offset);

  if (plan === undefined) {
    return false;
  }
  const { cursor, neighbour, boundary } = plan;
  const tr = state.tr;

  if (isAtom(state.doc.schema, neighbour)) {
    const empty = cursor.parent.content.length === 0;

    if (empty) {
      tr.delete(cursor.before(cursor.depth), cursor.after(cursor.depth));
    }

    tr.setSelection(
      empty
        ? { kind: 'gap', id: neighbour.id, side: offset < 0 ? 'end' : 'start' }
        : { kind: 'node', id: neighbour.id },
    );
  } else if (
    isTextblock(state.doc.schema, neighbour) &&
    tr.maybeStep({ kind: 'replace', from: boundary - 1, to: boundary + 1, slice: EMPTY_SLICE }).ok
  ) {
    tr.setSelection(textSelection(offset < 0 ? boundary - 1 : cursor.pos));
  } else {
    return false;
  }
  dispatch?.(tr);
  return true;
};

export const joinBackward: Command = (state, dispatch) => joinTowards(state, -1, dispatch);

export const joinForward: Command = (state, dispatch) => joinTowards(state, 1, dispatch);

const textblockAfter = (schema: Schema, cursor: ResolvedPos): string | undefined => {
  const depth = cursor.depth - 1;
  const parent = cursor.node(depth);
  const type = schema.nodes.get(parent.type);
  const match = type?.content.matchContent(parent.content.slice(0, cursor.indexAt(depth) + 1));

  return [...(match?.next.keys() ?? [])].find((name) => {
    const candidate = schema.nodes.get(name);

    return (
      candidate?.inlineContent === true &&
      Object.values(candidate.attrs).every((spec) => spec.default !== undefined)
    );
  });
};

export const splitBlock: Command = (state, dispatch) => {
  const first =
    state.selection.kind === SelectionKind.Text && !isCursor(state.selection)
      ? state.tr.deleteSelection()
      : state.tr;

  const head = first.selection.kind === SelectionKind.Text ? first.selection.head : undefined;
  const cursor = head === undefined ? undefined : first.doc.resolve(head);

  if (cursor === undefined || cursor.depth === 0 || !isTextblock(first.doc.schema, cursor.parent)) {
    return false;
  }
  const atEnd = cursor.pos === cursor.end(cursor.depth);
  const after = atEnd ? textblockAfter(first.doc.schema, cursor) : undefined;

  first.split(
    cursor.pos,
    1,
    after === undefined || after === cursor.parent.type ? undefined : { type: after },
  );

  first.setSelection(textSelection(cursor.pos + 2));
  dispatch?.(first);
  return true;
};

const marksAt = (tr: Transaction): readonly Mark[] => {
  if (tr.storedMarks !== null) {
    return tr.storedMarks;
  }

  const before =
    tr.selection.kind === SelectionKind.Text
      ? tr.doc.resolve(tr.selection.head).nodeBefore
      : undefined;

  return before?.kind === ContentNodeKind.Text ? before.marks : [];
};

const everyHas = (state: EditorState, from: number, to: number, type: string): boolean => {
  let all = true;
  let seen = false;

  state.doc.nodesBetween(from, to, (node, _pos, parent) => {
    if (
      node.kind === ContentNodeKind.Text &&
      state.doc.schema.nodes.get(parent.type)?.marks.has(type) === true
    ) {
      seen = true;
      all &&= node.marks.some((mark) => mark.type === type);
    }
    return all;
  });

  return seen && all;
};

export const toggleMark =
  (type: string, attrs: Readonly<Record<string, AttrValue>> = {}): Command =>
  (state, dispatch) => {
    if (dispatch === undefined) {
      return state.doc.schema.marks.has(type);
    }

    const mark = state.doc.schema.mark(type, attrs);
    const range = selectionRange(state.doc, state.selection);
    const tr = state.tr;

    if (range.from === range.to) {
      const marks = marksAt(tr);

      tr.setStoredMarks(
        marks.some((item) => item.type === type)
          ? marks.filter((item) => item.type !== type)
          : [...marks, mark],
      );
    } else if (everyHas(state, range.from, range.to, type)) {
      tr.removeMark(range.from, range.to, type);
    } else {
      tr.addMark(range.from, range.to, mark);
    }
    dispatch(tr);
    return true;
  };
