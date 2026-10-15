import type { ResolvedPos } from '../doc/doc.types';
import { isCursor } from '../state/selection';
import type { EditorState } from '../state/state.types';

export const textCursor = (state: EditorState): ResolvedPos | undefined => {
  const selection = state.selection;

  if (selection.kind !== 'text' || !isCursor(selection)) {
    return undefined;
  }
  const cursor = state.doc.resolve(selection.head);

  return state.doc.schema.nodes.get(cursor.parent.type)?.inlineContent === true
    ? cursor
    : undefined;
};

export const inCode = (state: EditorState): boolean => {
  const cursor = textCursor(state);

  return cursor !== undefined && state.doc.schema.nodes.get(cursor.parent.type)?.code === true;
};
