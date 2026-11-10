import type { Relocation } from '../engine/places';
import { isIndexSegment, isUnder, joinPath, segmentsOf } from '../paths/paths';

const rowPath = (path: string, list: string, relocate: Relocation): string | undefined => {
  const [index = '', ...rest] = segmentsOf(path.slice(list.length + 1));

  if (!isIndexSegment(index)) {
    return path;
  }

  const next = relocate(Number(index));

  return next === undefined ? undefined : joinPath(list, next, ...rest);
};

export const isInside = (path: string, list: string): boolean =>
  path !== list && isUnder(path, list);

export const forgetInside = (kept: Map<string, unknown>, list: string): void => {
  for (const path of kept.keys()) {
    if (isInside(path, list)) {
      kept.delete(path);
    }
  }
};

export const relocateInside = <T>(
  kept: Map<string, T>,
  list: string,
  relocate: Relocation,
): void => {
  const next = [...kept].reduce<Array<readonly [string, T]>>((moved, [path, value]) => {
    const target = isInside(path, list) ? rowPath(path, list, relocate) : path;

    if (target !== undefined) {
      moved.push([target, value]);
    }
    return moved;
  }, []);

  kept.clear();

  for (const [path, value] of next) {
    kept.set(path, value);
  }
};
