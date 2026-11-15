import { minBy, range } from 'lodash-es';

const MIN_DISTANCE = 2;
const LENGTH_SHARE = 3;

const editDistance = (from: string, to: string): number => {
  let previous = Array.from({ length: to.length + 1 }, (_, index) => index);

  for (const row of range(from.length)) {
    const current = [row + 1];

    for (const column of range(to.length)) {
      const replaced = (previous[column] ?? 0) + (from.charAt(row) === to.charAt(column) ? 0 : 1);
      const inserted = (current[column] ?? 0) + 1;
      const removed = (previous[column + 1] ?? 0) + 1;

      current.push(Math.min(replaced, inserted, removed));
    }
    previous = current;
  }
  return previous[to.length] ?? 0;
};

export const nearest = (name: string, candidates: Iterable<string>): string | undefined => {
  const wanted = name.toLowerCase();
  const limit = Math.max(MIN_DISTANCE, Math.floor(name.length / LENGTH_SHARE));

  const best = minBy(
    [...candidates].map((candidate) => ({
      candidate,
      distance: editDistance(wanted, candidate.toLowerCase()),
    })),
    'distance',
  );

  return best === undefined || best.distance > limit ? undefined : best.candidate;
};
