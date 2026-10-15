import { emptyTextblock } from '../doc/empty';
import { contentSize, nodeSize } from '../model/node';
import type { ContentNode } from '../model/node.types';
import { nearestCursor, selectionRange, textSelection } from '../state/selection';
import type { Selection } from '../state/selection.types';
import type { Command, EditorState } from '../state/state.types';

const startOf = (content: readonly ContentNode[], index: number): number =>
  contentSize(content.slice(0, index));

export const blockIndex = (state: EditorState): number | undefined => {
  const range = selectionRange(state.doc, state.selection);
  const $from = state.doc.resolve(range.from);

  return $from.depth >= 1 ? $from.indexAt(0) : $from.index;
};

const moved = (content: readonly ContentNode[], from: number, to: number): ContentNode[] => {
  const node = content[from];
  const rest = content.filter((_, index) => index !== from);

  return node === undefined ? [...content] : [...rest.slice(0, to), node, ...rest.slice(to)];
};

const followed = (state: EditorState, from: number, delta: number): Selection | undefined => {
  const { selection } = state;
  const index = blockIndex(state);

  return selection.kind === 'text' && index === from
    ? textSelection(selection.anchor + delta, selection.head + delta)
    : undefined;
};

export const moveBlock =
  (from: number, to: number): Command =>
  (state, dispatch) => {
    const { content } = state.doc.root;

    if (from === to || content[from] === undefined || content[to] === undefined) {
      return false;
    }
    const low = Math.min(from, to);
    const high = Math.max(from, to);
    const start = startOf(content, low);
    const reordered = moved(content, from, to);
    const slice = { content: reordered.slice(low, high + 1), openStart: 0, openEnd: 0 };
    const selection = followed(state, from, startOf(reordered, to) - startOf(content, from));
    const tr = state.tr;

    if (!tr.maybeStep({ kind: 'replace', from: start, to: startOf(content, high + 1), slice }).ok) {
      return false;
    }
    if (selection !== undefined) {
      tr.setSelection(selection);
    }
    dispatch?.(tr);
    return true;
  };

export const moveCurrentBlock =
  (direction: -1 | 1): Command =>
  (state, dispatch) => {
    const index = blockIndex(state);

    return index !== undefined && moveBlock(index, index + direction)(state, dispatch);
  };

export const duplicateBlock =
  (index: number): Command =>
  (state, dispatch) => {
    const node = state.doc.root.content[index];

    if (node === undefined) {
      return false;
    }
    const at = startOf(state.doc.root.content, index + 1);

    dispatch?.(state.tr.insert(at, [node]));
    return true;
  };

export const deleteBlock =
  (index: number): Command =>
  (state, dispatch) => {
    const { content } = state.doc.root;
    const node = content[index];
    const tr = state.tr;

    if (node === undefined) {
      return false;
    }
    const from = startOf(content, index);
    const lone = content.length === 1;
    const filler = lone ? emptyTextblock(state.doc.schema, tr.newId()) : undefined;

    tr.replace(from, from + nodeSize(node), {
      content: filler === undefined ? [] : [filler],
      openStart: 0,
      openEnd: 0,
    });

    tr.setSelection(nearestCursor(tr.doc, Math.min(from, tr.doc.size), lone ? 1 : -1));
    dispatch?.(tr);
    return true;
  };

export const blockStart = (state: EditorState, index: number): number =>
  startOf(state.doc.root.content, index);

export const focusBlock =
  (index: number): Command =>
  (state, dispatch) => {
    if (state.doc.root.content[index] === undefined) {
      return false;
    }
    dispatch?.(state.tr.setSelection(nearestCursor(state.doc, blockStart(state, index) + 1)));
    return true;
  };
