import type { EntryState } from '../engine/engine';

export const toMessages = (value: string | readonly string[] | undefined): readonly string[] => {
  if (value === undefined) {
    return [];
  }
  return typeof value === 'string' ? [value] : value;
};

export const unique = (messages: readonly string[]): readonly string[] => [...new Set(messages)];

const sameMessages = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((message, index) => message === right[index]);

export const writeErrors = (state: EntryState, messages: readonly string[]): void => {
  if (!sameMessages(state.errors.value, messages)) {
    state.setErrors(messages);
  }
};
