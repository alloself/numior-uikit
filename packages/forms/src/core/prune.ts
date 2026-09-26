import { isUnder } from '../paths/paths';
import { deleteAt, expandPattern } from '../values/access';
import type { Entry } from './registry';

const covered = (path: string, active: readonly Entry[]): boolean =>
  active.some((entry) => isUnder(entry.path(), path));

export const prune = (target: object, known: Iterable<string>, active: readonly Entry[]): void => {
  for (const pattern of known) {
    for (const path of expandPattern(target, pattern)) {
      if (!covered(path, active)) {
        deleteAt(target, path);
      }
    }
  }
};
