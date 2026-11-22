export interface TextSpan {
  readonly head: number;
  readonly tail: number;
}

const isHighSurrogate = (unit: number): boolean => unit >= 0xd800 && unit <= 0xdbff;

const isLowSurrogate = (unit: number): boolean => unit >= 0xdc00 && unit <= 0xdfff;

export const commonRun = (limit: number, same: (index: number) => boolean): number => {
  let count = 0;

  while (count < limit && same(count)) {
    count += 1;
  }
  return count;
};

export const commonSpan = (
  before: string,
  after: string,
  same: (left: number, right: number) => boolean,
): TextSpan => {
  const limit = Math.min(before.length, after.length);
  const start = commonRun(limit, (index) => same(index, index));
  const head = start > 0 && isHighSurrogate(before.charCodeAt(start - 1)) ? start - 1 : start;

  const end = commonRun(limit - head, (index) =>
    same(before.length - 1 - index, after.length - 1 - index),
  );

  const tail = end > 0 && isLowSurrogate(before.charCodeAt(before.length - end)) ? end - 1 : end;

  return { head, tail };
};

export const commonText = (before: string, after: string): TextSpan =>
  commonSpan(before, after, (left, right) => before[left] === after[right]);
