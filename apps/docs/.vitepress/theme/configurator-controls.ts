const SEGMENT_LIMIT = 4;
const SEGMENT_PADDING = 4;
const SEGMENT_BUDGET = 30;

export const fitsSegments = (values: readonly string[]): boolean =>
  values.length <= SEGMENT_LIMIT &&
  values.join('').length + values.length * SEGMENT_PADDING <= SEGMENT_BUDGET;
