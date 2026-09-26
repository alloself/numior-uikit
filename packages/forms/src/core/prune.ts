import type { SubmittedValues } from '../paths/paths.types';
import { deleteAt, expandPattern } from '../values/access';
import { isEqualValue } from '../values/equal';
import { isTraversable } from '../values/kinds';

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

const within = (part: unknown, whole: unknown): boolean => {
  if (part === undefined) {
    return true;
  }
  if (!isTraversable(part) || !isTraversable(whole)) {
    return isEqualValue(part, whole);
  }
  return (
    Array.isArray(part) === Array.isArray(whole) &&
    Object.keys(part).every(
      (key) => Object.hasOwn(whole, key) && within(Reflect.get(part, key), Reflect.get(whole, key)),
    )
  );
};

export const isPrunedFrom = <V>(pruned: unknown, source: V): pruned is SubmittedValues<V> =>
  within(pruned, source);
