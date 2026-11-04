import type { ResolvedPos } from '../doc/doc.types';
import { emptyTextblock } from '../doc/empty';
import { nodeSize } from '../model/node';
import { ContentNodeKind, type ContentNode, type ElementNode } from '../model/node.types';
import { TextDirection, TextUnit, type InputIntent, type InputSource } from '../state/input.types';
import { createMetaKey } from '../state/plugin';
import { nearestCursor, selectionRange, textPosition, textSelection } from '../state/selection';
import type { Selection, SelectionRange } from '../state/selection.types';
import {
  InputIntentKind,
  SelectionKind,
  type Command,
  type EditorState,
} from '../state/state.types';
import { ATOM, breakTypeOf, caretNear, isAtom, isInline } from './atoms';
import { gapDelete, gapEnter, gapSpot, gapText } from './gap';
import { attempt } from './attempt';
import { exitEmptyLast, liftAtStart, splitListItem } from './blocks';
import { codeFence, codeNewline, codeToParagraph } from './code';
import { inCode, textCursor } from './cursor';
import { pasteCommand } from './paste';
import {
  chainCommands,
  deleteSelection,
  joinBackward,
  joinForward,
  splitBlock,
  toggleMark,
} from './commands';

export const inputSource = createMetaKey<InputSource>('input');

const SPACE = /^\s+$/u;

const segmenters = new Map<string, Intl.Segmenter>();

const segmenterOf = (unit: 'character' | 'word'): Intl.Segmenter => {
  const granularity = unit === TextUnit.Character ? 'grapheme' : 'word';
  const known = segmenters.get(granularity);

  if (known !== undefined) {
    return known;
  }
  const segmenter = new Intl.Segmenter(undefined, { granularity });

  segmenters.set(granularity, segmenter);
  return segmenter;
};

export const inlineText = (node: ElementNode): string =>
  node.content.map((child) => (child.kind === ContentNodeKind.Text ? child.text : ATOM)).join('');

const pieces = (text: string, unit: 'character' | 'word'): string[] =>
  [...segmenterOf(unit).segment(text)].map((part) => part.segment);

const wordSpan = (parts: readonly string[]): number => {
  let at = parts.length - 1;
  let span = 0;

  while (at >= 0 && SPACE.test(parts[at] ?? '')) {
    span += parts[at]?.length ?? 0;
    at -= 1;
  }
  return span + (parts[at]?.length ?? 0);
};

const spanOf = (text: string, unit: TextUnit, direction: TextDirection): number => {
  if (unit === TextUnit.Line) {
    return text.length;
  }
  const parts = pieces(text, unit);
  const ordered = direction === TextDirection.Backward ? parts : parts.toReversed();

  return unit === TextUnit.Character ? (ordered.at(-1)?.length ?? 0) : wordSpan(ordered);
};

const dropEmpty =
  (backward: boolean): Command =>
  (state, dispatch) => {
    const cursor = textCursor(state);

    if (cursor === undefined || cursor.parent.content.length > 0 || cursor.depth < 1) {
      return false;
    }
    const start = cursor.before(cursor.depth);
    const size = nodeSize(cursor.parent);

    return attempt(state, dispatch, (tr) => {
      tr.delete(start, start + size);

      const target = textPosition(tr.doc, start, backward ? -1 : 1);

      if (target === undefined) {
        return false;
      }
      tr.setSelection(textSelection(target));
      return true;
    });
  };

const deleteNode =
  (backward: boolean): Command =>
  (state, dispatch) => {
    const { selection, doc } = state;
    const node = selection.kind === SelectionKind.Node ? doc.byId(selection.id) : undefined;
    const at = node === undefined ? undefined : doc.positionOf(node.id);

    if (node === undefined || at === undefined || isInline(doc.schema, node)) {
      return false;
    }
    return attempt(state, dispatch, (tr) => {
      tr.delete(at, at + nodeSize(node));

      if (tr.changed) {
        tr.setSelection(caretNear(tr.doc, at, backward ? -1 : 1));
        return true;
      }
      const block = emptyTextblock(doc.schema, tr.newId());

      if (block === undefined) {
        return false;
      }
      tr.insert(at, [block]);
      tr.delete(at + nodeSize(block), at + nodeSize(block) + nodeSize(node));
      tr.setSelection(textSelection(at + 1));
      return true;
    });
  };

export const deleteText =
  (direction: TextDirection, unit: TextUnit): Command =>
  (state, dispatch) => {
    if (
      gapDelete(direction === TextDirection.Backward)(state, dispatch) ||
      deleteNode(direction === TextDirection.Backward)(state, dispatch) ||
      deleteSelection(state, dispatch)
    ) {
      return true;
    }
    const cursor = textCursor(state);

    if (cursor === undefined) {
      return false;
    }
    const text = inlineText(cursor.parent);
    const offset = cursor.parentOffset;
    const backward = direction === TextDirection.Backward;

    if (backward ? offset === 0 : offset === text.length) {
      return chainCommands(backward ? joinBackward : joinForward, dropEmpty(backward))(
        state,
        dispatch,
      );
    }
    const span = spanOf(backward ? text.slice(0, offset) : text.slice(offset), unit, direction);
    const from = backward ? cursor.pos - span : cursor.pos;

    dispatch?.(state.tr.delete(from, from + span));
    return true;
  };

export const deleteRange =
  ({ from, to }: SelectionRange): Command =>
  (state, dispatch) => {
    if (from >= to) {
      return false;
    }
    const tr = state.tr.delete(from, to);

    dispatch?.(tr.setSelection(nearestCursor(tr.doc, from)));
    return true;
  };

export const insertText =
  (text: string, range?: SelectionRange, caret?: number): Command =>
  (state, dispatch) => {
    const tr = state.tr;

    if (range === undefined) {
      tr.deleteSelection().insertText(text);
    } else {
      tr.insertText(text, range.from, range.to);
      tr.setSelection(nearestCursor(tr.doc, caret ?? range.from + text.length));
    }
    dispatch?.(tr);
    return true;
  };

const typeOverBlock =
  (text: string): Command =>
  (state, dispatch) => {
    const { selection, doc } = state;
    const node = selection.kind === SelectionKind.Node ? doc.byId(selection.id) : undefined;
    const at = node === undefined ? undefined : doc.positionOf(node.id);
    const tr = state.tr;
    const block = node === undefined ? undefined : emptyTextblock(doc.schema, tr.newId());

    if (
      node === undefined ||
      at === undefined ||
      block === undefined ||
      isInline(doc.schema, node)
    ) {
      return false;
    }
    tr.delete(at, at + nodeSize(node));

    tr.insert(at, [
      doc.schema.element(block.type, { id: block.id, content: [doc.schema.text(text)] }),
    ]);

    tr.setSelection(textSelection(at + 1 + text.length));
    dispatch?.(tr);
    return true;
  };

const insertBreak: Command = (state, dispatch) => {
  const name = breakTypeOf(state.doc.schema);
  const cursor = textCursor(state);

  if (name === undefined || cursor === undefined) {
    return false;
  }
  const tr = state.tr;
  const node = state.doc.schema.element(name, { id: tr.newId() });

  tr.replaceSelection({ content: [node], openStart: 0, openEnd: 0 });

  if (!tr.changed) {
    return false;
  }
  dispatch?.(tr);
  return true;
};

const newline: Command = (state, dispatch) => inCode(state) && insertText('\n')(state, dispatch);

const paragraphAfterNode: Command = (state, dispatch) => {
  const { selection, doc } = state;
  const node = selection.kind === SelectionKind.Node ? doc.byId(selection.id) : undefined;
  const at = node === undefined ? undefined : doc.positionOf(node.id);

  if (node === undefined || at === undefined) {
    return false;
  }
  if (isInline(doc.schema, node)) {
    dispatch?.(state.tr.setSelection(nearestCursor(doc, at + nodeSize(node))));
    return true;
  }
  return attempt(state, dispatch, (tr) => {
    const block = emptyTextblock(doc.schema, tr.newId());
    const end = at + nodeSize(node);

    if (block === undefined) {
      return false;
    }
    tr.insert(end, [block]);
    tr.setSelection(textSelection(end + 1));
    return true;
  });
};

export const insertParagraph: Command = (state, dispatch) =>
  codeFence(state, dispatch) ||
  codeNewline(state, dispatch) ||
  exitEmptyLast(state, dispatch) ||
  splitBlock(state, dispatch) ||
  paragraphAfterNode(state, dispatch);

export const insertLineBreak: Command = (state, dispatch) =>
  newline(state, dispatch) || insertBreak(state, dispatch) || splitBlock(state, dispatch);

const blockBeside = (cursor: ResolvedPos, backward: boolean): ContentNode | undefined => {
  const depth = cursor.depth - 1;
  const atEdge = backward ? cursor.parentOffset === 0 : cursor.pos === cursor.end(cursor.depth);

  return depth >= 0 && atEdge
    ? cursor.node(depth).content[cursor.indexAt(depth) + (backward ? -1 : 1)]
    : undefined;
};

const atomBeside = (
  state: EditorState,
  cursor: ResolvedPos,
  backward: boolean,
): ElementNode | undefined => {
  const schema = state.doc.schema;
  const inline = backward ? cursor.nodeBefore : cursor.nodeAfter;

  if (isAtom(schema, inline)) {
    return inline;
  }
  const block = blockBeside(cursor, backward);

  return isAtom(schema, block) ? block : undefined;
};

const leaveNode = (state: EditorState, backward: boolean, vertical: boolean): Selection => {
  const { selection, doc } = state;
  const node = selection.kind === SelectionKind.Node ? doc.byId(selection.id) : undefined;
  const range = selectionRange(doc, selection);

  if (node !== undefined && !vertical && !isInline(doc.schema, node)) {
    return { kind: 'gap', id: node.id, side: backward ? 'start' : 'end' };
  }
  return backward ? caretNear(doc, range.from, -1) : caretNear(doc, range.to, 1);
};

const leaveGap = (
  state: EditorState,
  backward: boolean,
  vertical: boolean,
): Selection | undefined => {
  const spot = gapSpot(state.doc, state.selection);

  if (spot === undefined) {
    return undefined;
  }
  if (!vertical && spot.side === (backward ? 'end' : 'start')) {
    return { kind: 'gap', id: spot.node.id, side: backward ? 'start' : 'end' };
  }
  return backward
    ? caretNear(state.doc, spot.at, -1)
    : caretNear(state.doc, spot.at + nodeSize(spot.node), 1);
};

const leaving = (
  state: EditorState,
  backward: boolean,
  vertical: boolean,
): Selection | undefined => {
  switch (state.selection.kind) {
    case SelectionKind.Node:
      return leaveNode(state, backward, vertical);
    case SelectionKind.Gap:
      return leaveGap(state, backward, vertical);
    default:
      return undefined;
  }
};

export const selectAtom =
  (direction: TextDirection, vertical = false): Command =>
  (state, dispatch) => {
    const backward = direction === TextDirection.Backward;
    const left = leaving(state, backward, vertical);

    if (left !== undefined) {
      dispatch?.(state.tr.setSelection(left));
      return true;
    }
    const cursor = vertical ? undefined : textCursor(state);
    const atom = cursor === undefined ? undefined : atomBeside(state, cursor, backward);

    if (atom === undefined) {
      return false;
    }

    dispatch?.(
      state.tr.setSelection(
        isInline(state.doc.schema, atom)
          ? { kind: 'node', id: atom.id }
          : { kind: 'gap', id: atom.id, side: backward ? 'end' : 'start' },
      ),
    );

    return true;
  };

const formatCommand =
  (mark: string): Command =>
  (state, dispatch) =>
    state.doc.schema.marks.has(mark) && toggleMark(mark)(state, dispatch);

export const intentCommand = (intent: InputIntent): Command => {
  switch (intent.kind) {
    case InputIntentKind.InsertText:
      return intent.range === undefined
        ? chainCommands(gapText(intent.text), typeOverBlock(intent.text), insertText(intent.text))
        : insertText(intent.text, intent.range);
    case InputIntentKind.Compose:
      return insertText(intent.text, intent.range, intent.caret);
    case InputIntentKind.InsertParagraph:
      return chainCommands(gapEnter, splitListItem, insertParagraph);
    case InputIntentKind.InsertLineBreak:
      return chainCommands(gapEnter, insertLineBreak);
    case InputIntentKind.Delete:
      if (intent.range !== undefined) {
        return deleteRange(intent.range);
      }
      return intent.direction === TextDirection.Backward
        ? chainCommands(codeToParagraph, liftAtStart, deleteText(intent.direction, intent.unit))
        : deleteText(intent.direction, intent.unit);
    case InputIntentKind.Format:
      return formatCommand(intent.mark);
    case InputIntentKind.Paste:
      return pasteCommand(intent.text, intent.html);
    case InputIntentKind.History:
    case InputIntentKind.Files:
      return () => false;
  }
};
