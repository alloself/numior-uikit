export const commonRun = (limit: number, same: (index: number) => boolean): number => {
  let count = 0;

  while (count < limit && same(count)) {
    count += 1;
  }
  return count;
};
