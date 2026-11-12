import type { ResolvedPos } from '../doc/doc.types';
import { ContentNodeKind, type ElementNode } from '../model/node.types';
import { textSelection } from '../state/selection';
import {
  SelectionKind,
  type Command,
  type EditorState,
  type Transaction,
} from '../state/state.types';
import { attempt } from './attempt';
import { caretInto, followingTextblock, retypeTextblock } from './blocks';
import { textCursor } from './cursor';

interface CodeSpot {
  readonly $from: ResolvedPos;
  readonly $to: ResolvedPos;
  readonly text: string;
  readonly start: number;
}

const CODE_TYPE = 'code_block';
const FENCE = /^```([\w#+.-]{1,32})?$/;
const INDENT = '  ';
const LEADING = /^[ \t]*/;

const plainText = (node: ElementNode): string | undefined =>
  node.content.every((child) => child.kind === ContentNodeKind.Text)
    ? node.content.map((child) => (child.kind === ContentNodeKind.Text ? child.text : '')).join('')
    : undefined;

const isCode = (state: EditorState, node: ElementNode): boolean =>
  state.doc.schema.nodes.get(node.type)?.code === true;

const codeSpot = (state: EditorState): CodeSpot | undefined => {
  if (state.selection.kind !== SelectionKind.Text) {
    return undefined;
  }

  const $from = state.doc.resolve(Math.min(state.selection.anchor, state.selection.head));
  const $to = state.doc.resolve(Math.max(state.selection.anchor, state.selection.head));
  const text = plainText($from.parent);

  return $from.parent.id === $to.parent.id && isCode(state, $from.parent) && text !== undefined
    ? { $from, $to, text, start: $from.start($from.depth) }
    : undefined;
};

const lineStart = (text: string, offset: number): number => text.lastIndexOf('\n', offset - 1) + 1;

const lineStarts = (text: string, from: number, to: number): number[] => {
  const starts = [lineStart(text, from)];

  for (
    let at = text.indexOf('\n', from);
    at !== -1 && at + 1 < to;
    at = text.indexOf('\n', at + 1)
  ) {
    starts.push(at + 1);
  }
  return starts;
};

export const codeFence: Command = (state, dispatch) => {
  const cursor = textCursor(state);
  const text = cursor === undefined ? undefined : plainText(cursor.parent);
  const match = text === undefined ? null : FENCE.exec(text);

  if (
    cursor === undefined ||
    text === undefined ||
    match === null ||
    isCode(state, cursor.parent) ||
    cursor.parentOffset !== text.length ||
    !state.doc.schema.nodes.has(CODE_TYPE)
  ) {
    return false;
  }

  const start = cursor.start(cursor.depth);
  const language = match[1]?.toLowerCase();

  return attempt(state, dispatch, (tr) => {
    if (!retypeTextblock(tr, cursor.pos, CODE_TYPE, language === undefined ? {} : { language })) {
      return false;
    }
    tr.delete(tr.mapping.map(start), tr.mapping.map(start + text.length));
    return true;
  });
};

const leaveCode = (tr: Transaction, spot: CodeSpot): boolean => {
  const { $from } = spot;
  const next = followingTextblock(tr.doc.schema, $from.node($from.depth - 1));

  if (next === undefined) {
    return false;
  }

  const at = tr.mapping.map($from.after($from.depth));

  tr.insert(at, [tr.doc.schema.element(next, { id: tr.newId() })]);
  caretInto(tr, at);
  return true;
};

export const exitCode: Command = (state, dispatch) => {
  const spot = codeSpot(state);

  return spot !== undefined && attempt(state, dispatch, (tr) => leaveCode(tr, spot));
};

export const codeNewline: Command = (state, dispatch) => {
  const spot = codeSpot(state);

  if (spot === undefined || spot.$from.pos !== spot.$to.pos) {
    return false;
  }

  const offset = spot.$from.parentOffset;
  const line = spot.text.slice(lineStart(spot.text, offset), offset);
  const lastLine = offset === spot.text.length && line === '' && spot.text.endsWith('\n');

  return attempt(state, dispatch, (tr) => {
    if (lastLine) {
      tr.delete(spot.start + offset - 1, spot.start + offset);
      return leaveCode(tr, spot);
    }
    tr.insertText(`\n${LEADING.exec(line)?.[0] ?? ''}`);
    return true;
  });
};

export const indentCode: Command = (state, dispatch) => {
  const spot = codeSpot(state);

  if (spot === undefined) {
    return false;
  }

  const from = spot.$from.parentOffset;
  const to = spot.$to.parentOffset;

  return attempt(state, dispatch, (tr) => {
    if (from === to) {
      tr.insertText(INDENT);
      return true;
    }
    for (const line of lineStarts(spot.text, from, to).toReversed()) {
      tr.insertText(INDENT, spot.start + line, spot.start + line);
    }
    return true;
  });
};

export const outdentCode: Command = (state, dispatch) => {
  const spot = codeSpot(state);

  if (spot === undefined) {
    return false;
  }

  const from = spot.$from.parentOffset;
  const to = spot.$to.parentOffset;

  return attempt(state, dispatch, (tr) => {
    for (const line of lineStarts(spot.text, from, to).toReversed()) {
      const width = /^ {1,2}|^\t/.exec(spot.text.slice(line))?.[0].length ?? 0;

      if (width <= 0) {
        continue;
      }

      tr.delete(spot.start + line, spot.start + line + width);
    }
    return true;
  });
};

export const codeToParagraph: Command = (state, dispatch) => {
  const cursor = textCursor(state);

  const next =
    cursor === undefined
      ? undefined
      : followingTextblock(state.doc.schema, cursor.node(cursor.depth - 1));

  if (
    cursor === undefined ||
    next === undefined ||
    !isCode(state, cursor.parent) ||
    cursor.parent.content.length > 0
  ) {
    return false;
  }
  return attempt(state, dispatch, (tr) => {
    if (!retypeTextblock(tr, cursor.pos, next)) {
      return false;
    }
    tr.setSelection(textSelection(tr.mapping.map(cursor.pos)));
    return true;
  });
};
