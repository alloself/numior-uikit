import { deleteAt, expandPattern } from '../values/access';

export const prune = (
  target: object,
  patterns: Iterable<string>,
  covered: ReadonlySet<string>,
): void => {
  for (const pattern of patterns) {
    for (const path of expandPattern(target, pattern)) {
      if (!covered.has(path)) {
        deleteAt(target, path);
      }
    }
  }
};
