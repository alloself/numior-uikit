import type { ResolvedPos } from '../doc/doc.types';
import {
  ContentNodeKind,
  type AttrValue,
  type ContentNode,
  type ElementNode,
  type Mark,
} from '../model/node.types';
import type { Schema } from '../schema/schema.types';
import { canMark } from './format';
import { isCursor, selectionRange, textSelection } from '../state/selection';
import {
  SelectionKind,
  type Command,
  type EditorState,
  type Transaction,
} from '../state/state.types';

const isTextblock = (schema: Schema, node: ContentNode | undefined): node is ElementNode =>
  node?.kind === ContentNodeKind.Element && schema.nodes.get(node.type)?.inlineContent === true;

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
    const able = canMark(state, type);

    if (dispatch === undefined || !able) {
      return able;
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
