import type { ResolvedPos } from '../doc/doc.types';
import type { ContentNode, ElementNode } from '../model/node.types';
import type { NodeType, Schema } from '../schema/schema.types';
import type { InputIntent, InputSource, TextDirection, TextUnit } from '../state/input.types';
import { createMetaKey } from '../state/plugin';
import { nearestCursor, selectionRange } from '../state/selection';
import type { SelectionRange } from '../state/selection.types';
import type { Command, EditorState } from '../state/state.types';
import { liftAtStart, splitListItem } from './blocks';
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

const ATOM = '￼';
const SPACE = /^\s+$/u;

const segmenters = new Map<string, Intl.Segmenter>();

const segmenterOf = (unit: 'character' | 'word'): Intl.Segmenter => {
  const granularity = unit === 'character' ? 'grapheme' : 'word';
  const known = segmenters.get(granularity);

  if (known !== undefined) {
    return known;
  }
  const segmenter = new Intl.Segmenter(undefined, { granularity });

  segmenters.set(granularity, segmenter);
  return segmenter;
};

export const inlineText = (node: ElementNode): string =>
  node.content.map((child) => (child.kind === 'text' ? child.text : ATOM)).join('');

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
  if (unit === 'line') {
    return text.length;
  }
  const parts = pieces(text, unit);
  const ordered = direction === 'backward' ? parts : parts.toReversed();

  return unit === 'character' ? (ordered.at(-1)?.length ?? 0) : wordSpan(ordered);
};

export const deleteText =
  (direction: TextDirection, unit: TextUnit): Command =>
  (state, dispatch) => {
    if (deleteSelection(state, dispatch)) {
      return true;
    }
    const cursor = textCursor(state);

    if (cursor === undefined) {
      return false;
    }
    const text = inlineText(cursor.parent);
    const offset = cursor.parentOffset;
    const backward = direction === 'backward';

    if (backward ? offset === 0 : offset === text.length) {
      return backward ? joinBackward(state, dispatch) : joinForward(state, dispatch);
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

const typeOf = (schema: Schema, node: ContentNode): NodeType | undefined =>
  node.kind === 'element' ? schema.nodes.get(node.type) : undefined;

const breakTypes = new WeakMap<Schema, string | null>();

const probes = (type: NodeType): boolean =>
  type.name !== 'text' &&
  type.inline &&
  type.leaf &&
  Object.values(type.attrs).every((attr) => attr.default !== undefined);

const findBreakType = (schema: Schema): string | null =>
  [...schema.nodes.values()].find(
    (type) => probes(type) && type.render(schema.element(type.name, { id: ATOM })).tag === 'br',
  )?.name ?? null;

const breakTypeOf = (schema: Schema): string | undefined => {
  const known = breakTypes.get(schema);
  const name = known === undefined ? findBreakType(schema) : known;

  breakTypes.set(schema, name);
  return name ?? undefined;
};

export const isAtom = (schema: Schema, node: ContentNode | undefined): node is ElementNode => {
  const type = node === undefined ? undefined : typeOf(schema, node);

  return (
    node?.kind === 'element' && type !== undefined && type.atom && type.name !== breakTypeOf(schema)
  );
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
  if (state.selection.kind !== 'node') {
    return false;
  }
  const range = selectionRange(state.doc, state.selection);
  const tr = state.tr.setSelection(nearestCursor(state.doc, range.to));

  dispatch?.(tr);
  return true;
};

export const insertParagraph: Command = (state, dispatch) =>
  codeFence(state, dispatch) ||
  codeNewline(state, dispatch) ||
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

const leaveNode =
  (state: EditorState, backward: boolean): Command =>
  (_, dispatch) => {
    const range = selectionRange(state.doc, state.selection);

    const target = backward
      ? nearestCursor(state.doc, range.from, -1)
      : nearestCursor(state.doc, range.to, 1);

    dispatch?.(state.tr.setSelection(target));
    return true;
  };

export const selectAtom =
  (direction: TextDirection, vertical = false): Command =>
  (state, dispatch) => {
    const backward = direction === 'backward';

    if (state.selection.kind === 'node') {
      return leaveNode(state, backward)(state, dispatch);
    }
    const cursor = vertical ? undefined : textCursor(state);
    const atom = cursor === undefined ? undefined : atomBeside(state, cursor, backward);

    if (atom === undefined) {
      return false;
    }
    dispatch?.(state.tr.setSelection({ kind: 'node', id: atom.id }));
    return true;
  };

const formatCommand =
  (mark: string): Command =>
  (state, dispatch) =>
    state.doc.schema.marks.has(mark) && toggleMark(mark)(state, dispatch);

export const intentCommand = (intent: InputIntent): Command => {
  switch (intent.kind) {
    case 'insertText':
      return insertText(intent.text, intent.range);
    case 'compose':
      return insertText(intent.text, intent.range, intent.caret);
    case 'insertParagraph':
      return chainCommands(splitListItem, insertParagraph);
    case 'insertLineBreak':
      return insertLineBreak;
    case 'delete':
      if (intent.range !== undefined) {
        return deleteRange(intent.range);
      }
      return intent.direction === 'backward'
        ? chainCommands(codeToParagraph, liftAtStart, deleteText(intent.direction, intent.unit))
        : deleteText(intent.direction, intent.unit);
    case 'format':
      return formatCommand(intent.mark);
    case 'paste':
      return pasteCommand(intent.text, intent.html);
    case 'history':
      return () => false;
  }
};
