import type { Dispatch, EditorState, Transaction } from '../state/state.types';

export const attempt = (
  state: EditorState,
  dispatch: Dispatch | undefined,
  build: (tr: Transaction) => boolean,
): boolean => {
  const tr = state.tr;

  try {
    if (!build(tr)) {
      return false;
    }
  } catch (error) {
    if (error instanceof RangeError) {
      return false;
    }
    throw error;
  }
  dispatch?.(tr);
  return true;
};
