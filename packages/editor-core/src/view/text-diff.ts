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
