import type { Attrs } from '../model/node.types';
import { isCursor, selectionRange } from '../state/selection';
import type { Command, EditorState, Transaction } from '../state/state.types';

export interface ActiveBlock {
  readonly type: string;
  readonly attrs: Attrs;
}

const cursorMarks = (state: EditorState, head: number): ReadonlySet<string> => {
  const before = state.doc.resolve(head).nodeBefore;
  const marks = state.storedMarks ?? (before?.kind === 'text' ? before.marks : []);

  return new Set(marks.map((mark) => mark.type));
};

export const activeMarks = (state: EditorState): ReadonlySet<string> => {
  const { doc, selection } = state;

  if (selection.kind === 'text' && isCursor(selection)) {
    return cursorMarks(state, selection.head);
  }
  const range = selectionRange(doc, selection);
  let shared: Set<string> | undefined;

  doc.nodesBetween(range.from, range.to, (node) => {
    if (node.kind === 'text') {
      const own = new Set(node.marks.map((mark) => mark.type));

      shared = new Set([...(shared ?? own)].filter((type) => own.has(type)));
    }
    return shared === undefined || shared.size > 0;
  });

  return shared ?? new Set();
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

interface Produced {
  tr?: Transaction | undefined;
}

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
