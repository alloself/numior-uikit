import type { Doc } from '../doc/doc.types';
import type { Command } from '../state/state.types';

export const replaceDocument =
  (next: Doc): Command =>
  (state, dispatch) => {
    dispatch?.(
      state.tr.replace(0, state.doc.size, {
        content: next.root.content,
        openStart: 0,
        openEnd: 0,
      }),
    );

    return true;
  };
