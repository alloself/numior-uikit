import type { ConditionalFormat } from './conditional.types';

const countsOf = (formats: readonly ConditionalFormat[]): Map<string, number> =>
  formats.reduce((counts, format) => {
    const key = JSON.stringify(format);

    return counts.set(key, (counts.get(key) ?? 0) + 1);
  }, new Map<string, number>());

const without = (
  formats: readonly ConditionalFormat[],
  taken: readonly ConditionalFormat[],
): ConditionalFormat[] => {
  const left = countsOf(taken);

  return formats.reduce<ConditionalFormat[]>((kept, format) => {
    const key = JSON.stringify(format);
    const count = left.get(key) ?? 0;

    if (count > 0) {
      left.set(key, count - 1);
    } else {
      kept.push(format);
    }
    return kept;
  }, []);
};

export const sameFormats = (
  left: readonly ConditionalFormat[],
  right: readonly ConditionalFormat[],
): boolean => left === right || JSON.stringify(left) === JSON.stringify(right);

export const patchFormats = (
  base: readonly ConditionalFormat[],
  mine: readonly ConditionalFormat[],
  theirs: readonly ConditionalFormat[],
): readonly ConditionalFormat[] =>
  sameFormats(theirs, base)
    ? mine
    : [...without(theirs, without(base, mine)), ...without(mine, base)];
