import { foldText } from '../intl/fold-text';

export interface TypeaheadState {
  readonly query: string;
  readonly at: number;
}

const TYPEAHEAD_RESET = 500;

export const emptyTypeahead: TypeaheadState = { query: '', at: 0 };

export const isTypeaheadActive = (state: TypeaheadState, now: number): boolean =>
  state.query !== '' && now - state.at <= TYPEAHEAD_RESET;

export const extendTypeahead = (
  state: TypeaheadState,
  key: string,
  now: number,
): TypeaheadState => ({
  query: now - state.at > TYPEAHEAD_RESET ? key : state.query + key,
  at: now,
});

const isRepeated = (query: string): boolean => {
  if (query.length < 2) {
    return false;
  }
  for (let index = 1; index < query.length; index += 1) {
    if (query[index] !== query[0]) {
      return false;
    }
  }
  return true;
};

export const lowerLabels = (labels: readonly string[]): readonly string[] =>
  labels.map((label) => foldText(label));

export const matchTypeahead = (
  lowered: readonly string[],
  query: string,
  activeIndex: number,
): number => {
  const count = lowered.length;

  if (count === 0 || query.length === 0) {
    return -1;
  }

  const repeated = isRepeated(query);
  const needle = foldText(repeated ? query.charAt(0) : query);
  const start = Math.max(0, query.length > 1 && !repeated ? activeIndex : activeIndex + 1) % count;

  for (let offset = 0; offset < count; offset += 1) {
    const index = (start + offset) % count;

    if (lowered[index]?.startsWith(needle) === true) {
      return index;
    }
  }
  return -1;
};
