export interface TextChange {
  readonly from: number;
  readonly to: number;
  readonly text: string;
}

export const commonPrefix = (left: string, right: string): number => {
  let index = 0;

  while (index < left.length && index < right.length && left[index] === right[index]) {
    index += 1;
  }
  return index;
};

export const commonSuffix = (left: string, right: string, prefix: number): number => {
  let count = 0;
  const limit = Math.min(left.length, right.length) - prefix;

  while (count < limit && left[left.length - 1 - count] === right[right.length - 1 - count]) {
    count += 1;
  }
  return count;
};

export const changeBetween = (before: string, after: string): TextChange => {
  const prefix = commonPrefix(before, after);
  const suffix = commonSuffix(before, after, prefix);

  return {
    from: prefix,
    to: before.length - suffix,
    text: after.slice(prefix, after.length - suffix),
  };
};

export const shiftAround = (
  known: string,
  shown: string,
  change: TextChange,
): number | undefined => {
  if (shown === known) {
    return 0;
  }
  const prefix = commonPrefix(known, shown);
  const tail = known.length - commonSuffix(known, shown, 0);
  const from = Math.min(prefix, tail);
  const to = Math.max(prefix, tail);

  if (change.from >= to) {
    return shown.length - known.length;
  }
  const ahead = change.to < from || (change.to === from && change.text === '');

  return ahead ? 0 : undefined;
};
