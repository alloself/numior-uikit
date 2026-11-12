const NONE = -1;

const firstNotBelow = (
  values: readonly number[],
  ends: readonly number[],
  value: number,
): number => {
  let low = 0;
  let high = ends.length;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);

    if ((values[ends[middle] ?? 0] ?? 0) < value) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
};

export const risingRun = (values: readonly number[]): ReadonlySet<number> => {
  const ends: number[] = [];
  const previous = values.map(() => NONE);

  values.forEach((value, index) => {
    if (value < 0) {
      return;
    }

    const length = firstNotBelow(values, ends, value);

    previous[index] = ends[length - 1] ?? NONE;
    ends[length] = index;
  });

  const run = new Set<number>();
  let index = ends.at(-1) ?? NONE;

  while (index !== NONE) {
    run.add(index);
    index = previous[index] ?? NONE;
  }
  return run;
};
