const TYPEAHEAD_RESET = 500;

export interface TypeaheadState {
  readonly query: string;
  readonly at: number;
}

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

const isRepeated = (query: string): boolean =>
  query.length > 1 && [...query].every((char) => char === query[0]);

const rotated = (length: number, start: number): number[] =>
  Array.from({ length }, (_, offset) => (start + offset) % length);

export const matchTypeahead = (
  labels: readonly string[],
  query: string,
  activeIndex: number,
): number => {
  if (labels.length === 0 || query.length === 0) {
    return -1;
  }
  const needle = (isRepeated(query) ? query[0] : query)?.toLowerCase() ?? '';
  const start = query.length > 1 && !isRepeated(query) ? activeIndex : activeIndex + 1;
  const order = rotated(labels.length, Math.max(0, start) % labels.length);
  return order.find((index) => labels[index]?.toLowerCase().startsWith(needle)) ?? -1;
};
