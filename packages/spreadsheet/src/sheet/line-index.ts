export interface LineIndex {
  readonly count: number;
  readonly lineAt: (position: number) => number;
  readonly positionOf: (line: number) => number | undefined;
}

const lowerBound = (sorted: Int32Array, value: number): number => {
  let low = 0;
  let high = sorted.length;

  while (low < high) {
    const middle = (low + high) >> 1;

    if ((sorted[middle] ?? 0) < value) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
};

export const createLineIndex = (total: number, hidden: readonly number[]): LineIndex => {
  const sorted = Int32Array.from(
    new Set(hidden.filter((line) => line >= 0 && line < total)),
  ).toSorted();

  const lineAt = (position: number): number => {
    let line = position;
    let before = 0;
    let next = lowerBound(sorted, line + 1);

    while (next !== before) {
      line = position + next;
      before = next;
      next = lowerBound(sorted, line + 1);
    }
    return line;
  };

  return {
    count: total - sorted.length,
    lineAt,
    positionOf: (line) => {
      const at = lowerBound(sorted, line);

      return sorted[at] === line ? undefined : line - at;
    },
  };
};
