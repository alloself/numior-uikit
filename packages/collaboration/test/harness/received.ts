import type { EditorState, Step, Transaction } from '@numior/editor-core';
import { receiveSteps, settleSteps } from '../../src';

const whole = (tr: Transaction | undefined): Transaction => {
  if (tr === undefined) {
    throw new Error('The steps do not apply to the document');
  }
  return tr;
};

export const received = (state: EditorState, steps: readonly Step[]): Transaction =>
  whole(receiveSteps(state, steps));

export const settledWith = (
  state: EditorState,
  count: number,
  steps: readonly Step[],
  version: number,
): Transaction => whole(settleSteps(state, count, steps, version));
