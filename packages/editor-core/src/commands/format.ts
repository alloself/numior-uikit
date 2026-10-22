import type { Doc } from '../doc/doc.types';
import { nodeSize, sameMarks } from '../model/node';
import type { Attrs, Mark } from '../model/node.types';
import { isCursor, selectionRange, textSelection } from '../state/selection';
import type { SelectionRange } from '../state/selection.types';
import type { Command, EditorState, Transaction } from '../state/state.types';

export interface ActiveBlock {
  readonly type: string;
  readonly attrs: Attrs;
}

interface Produced {
  tr?: Transaction | undefined;
}

interface MarkSpan {
  readonly from: number;
  readonly to: number;
  readonly mark: Mark | undefined;
}

const cursorMarks = (state: EditorState, head: number): ReadonlySet<string> => {
  const before = state.doc.resolve(head).nodeBefore;
  const marks = state.storedMarks ?? (before?.kind === 'text' ? before.marks : []);

  return new Set(marks.map((mark) => mark.type));
};

const hasType = (marks: readonly Mark[], type: string): boolean =>
  marks.some((mark) => mark.type === type);

const keptTypes = (types: readonly string[], marks: readonly Mark[]): readonly string[] =>
  types.every((type) => hasType(marks, type))
    ? types
    : types.filter((type) => hasType(marks, type));

export const activeMarks = (state: EditorState): ReadonlySet<string> => {
  const { doc, selection } = state;

  if (selection.kind === 'text' && isCursor(selection)) {
    return cursorMarks(state, selection.head);
  }
  const range = selectionRange(doc, selection);
  let shared: readonly string[] | undefined;

  doc.nodesBetween(range.from, range.to, (node) => {
    if (node.kind === 'text') {
      const marks = node.marks;

      shared = shared === undefined ? marks.map((mark) => mark.type) : keptTypes(shared, marks);
    }
    return shared === undefined || shared.length > 0;
  });

  return new Set(shared);
};

export const activeBlock = (state: EditorState): ActiveBlock | undefined => {
  const range = selectionRange(state.doc, state.selection);
  const $from = state.doc.resolve(range.from);
  const { parent } = $from;

  return state.doc.schema.nodes.get(parent.type)?.inlineContent === true
    ? { type: parent.type, attrs: parent.attrs }
    : undefined;
};

export const ancestorTypes = (state: EditorState): readonly string[] => {
  const range = selectionRange(state.doc, state.selection);
  const $from = state.doc.resolve(range.from);

  return Array.from({ length: $from.depth }, (_, depth) => $from.node($from.depth - depth).type);
};

const appendTo = (combined: Transaction | undefined, next: Transaction): Transaction => {
  if (combined === undefined) {
    return next;
  }
  for (const step of next.steps) {
    combined.step(step);
  }
  if (next.selectionSet) {
    combined.setSelection(next.selection);
  }
  return combined;
};

export const sequence =
  (...commands: readonly Command[]): Command =>
  (state, dispatch) => {
    let current = state;
    let combined: Transaction | undefined;

    for (const command of commands) {
      const produced: Produced = {};

      if (
        !command(current, (tr) => {
          produced.tr = tr;
        })
      ) {
        return false;
      }
      if (produced.tr !== undefined) {
        combined = appendTo(combined, produced.tr);
        current = current.apply(produced.tr);
      }
    }
    if (combined !== undefined) {
      dispatch?.(combined);
    }
    return true;
  };

const spansOf = (doc: Doc, pos: number, type: string): MarkSpan[] => {
  const $pos = doc.resolve(pos);
  let offset = $pos.start($pos.depth);

  return $pos.parent.content.map((child) => {
    const from = offset;

    offset += nodeSize(child);
    return {
      from,
      to: offset,
      mark: child.kind === 'text' ? child.marks.find((mark) => mark.type === type) : undefined,
    };
  });
};

const sameMark = (left: Mark | undefined, right: Mark | undefined): boolean =>
  left !== undefined && right !== undefined && sameMarks([left], [right]);

export const markExtent = (doc: Doc, pos: number, type: string): SelectionRange | undefined => {
  const spans = spansOf(doc, pos, type);

  const index = spans.findIndex(
    (span) => span.mark !== undefined && span.from <= pos && pos <= span.to,
  );

  const mark = spans[index]?.mark;
  let first = index;
  let last = index;

  if (index < 0) {
    return undefined;
  }
  while (sameMark(spans[first - 1]?.mark, mark)) {
    first -= 1;
  }
  while (sameMark(spans[last + 1]?.mark, mark)) {
    last += 1;
  }
  return { from: spans[first]?.from ?? pos, to: spans[last]?.to ?? pos };
};

const marksNear = (state: EditorState, pos: number): readonly Mark[] => {
  const $pos = state.doc.resolve(pos);
  const near = [$pos.nodeBefore, $pos.nodeAfter].find((node) => node?.kind === 'text');

  return near?.kind === 'text' ? near.marks : [];
};

export const markAttrs = (state: EditorState, type: string): Attrs | undefined => {
  const range = selectionRange(state.doc, state.selection);

  const marks =
    range.from === range.to
      ? (state.storedMarks ?? marksNear(state, range.from))
      : marksNear(state, range.from + 1);

  return marks.find((mark) => mark.type === type)?.attrs;
};

const storedWith = (state: EditorState, type: string, mark: Mark | undefined): Mark[] => [
  ...(
    state.storedMarks ?? marksNear(state, selectionRange(state.doc, state.selection).from)
  ).filter((item) => item.type !== type),
  ...(mark === undefined ? [] : [mark]),
];

export const setMark =
  (type: string, attrs: Attrs | null): Command =>
  (state, dispatch) => {
    const { schema } = state.doc;
    const range = selectionRange(state.doc, state.selection);
    const target = range.from === range.to ? markExtent(state.doc, range.from, type) : range;
    const mark = attrs === null ? undefined : schema.mark(type, attrs);
    const tr = state.tr;

    if (target === undefined) {
      tr.setStoredMarks(storedWith(state, type, mark));
    } else if (mark === undefined) {
      tr.removeMark(target.from, target.to, type);
    } else {
      tr.addMark(target.from, target.to, mark);
    }
    dispatch?.(tr);
    return true;
  };

export const insertMarked =
  (text: string, type: string, attrs: Attrs): Command =>
  (state, dispatch) => {
    const { schema } = state.doc;
    const tr = state.tr.deleteSelection();
    const head = tr.selection.kind === 'text' ? tr.selection.head : undefined;

    if (head === undefined || text === '') {
      return false;
    }
    const marks = [...storedWith(state, type, undefined), schema.mark(type, attrs)];

    tr.replace(head, head, { content: [schema.text(text, marks)], openStart: 0, openEnd: 0 });

    tr.setSelection(textSelection(head + text.length)).setStoredMarks(
      marks.filter((mark) => mark.type !== type),
    );

    dispatch?.(tr);
    return true;
  };
