export interface LineIndex {
  readonly count: number;
  readonly lineAt: (position: number) => number;
  readonly positionOf: (line: number) => number | undefined;
  readonly positionNear: (line: number) => number;
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

const hiddenUpTo = (sorted: Int32Array, position: number): number => {
  let low = 0;
  let high = sorted.length;

  while (low < high) {
    const middle = (low + high) >> 1;

    if ((sorted[middle] ?? 0) - middle <= position) {
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

  return {
    count: total - sorted.length,
    lineAt: (position) => position + hiddenUpTo(sorted, position),
    positionOf: (line) => {
      const at = lowerBound(sorted, line);

      return sorted[at] === line ? undefined : line - at;
    },
    positionNear: (line) =>
      Math.max(0, Math.min(line - lowerBound(sorted, line), total - sorted.length - 1)),
  };
};
