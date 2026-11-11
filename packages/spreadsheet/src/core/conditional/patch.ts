import type { CellRange } from '../cell.types';
import type { ConditionalEntry, ConditionalFormat } from './conditional.types';

interface Placed {
  readonly key: string;
  readonly group: string;
  readonly ranges: readonly CellRange[];
  readonly extension: boolean | undefined;
  readonly entry: ConditionalEntry;
}

interface Group {
  readonly ranges: readonly CellRange[];
  readonly extension: boolean | undefined;
  readonly rules: ConditionalEntry[];
}

const placedOf = (formats: readonly ConditionalFormat[]): Placed[] =>
  formats
    .flatMap((format) => {
      const group = JSON.stringify([format.ranges, format.extension ?? false]);

      return format.rules.map((entry): Placed => ({
        key: `${group}${JSON.stringify({ ...entry, priority: 0 })}`,
        group,
        ranges: format.ranges,
        extension: format.extension,
        entry,
      }));
    })
    .toSorted((left, right) => left.entry.priority - right.entry.priority);

const formatsOf = (rules: readonly Placed[]): ConditionalFormat[] => {
  const groups = new Map<string, Group>();

  rules.forEach((rule, index) => {
    const group = groups.get(rule.group) ?? {
      ranges: rule.ranges,
      extension: rule.extension,
      rules: [],
    };

    group.rules.push({ ...rule.entry, priority: index + 1 });
    groups.set(rule.group, group);
  });

  return [...groups.values()].map(({ ranges, extension, rules: entries }): ConditionalFormat =>
    extension === undefined ? { ranges, rules: entries } : { ranges, rules: entries, extension },
  );
};

const countsOf = (rules: readonly Placed[]): Map<string, number> =>
  rules.reduce(
    (counts, rule) => counts.set(rule.key, (counts.get(rule.key) ?? 0) + 1),
    new Map<string, number>(),
  );

const without = (rules: readonly Placed[], taken: readonly Placed[]): Placed[] => {
  const left = countsOf(taken);

  return rules.reduce<Placed[]>((kept, rule) => {
    const count = left.get(rule.key) ?? 0;

    if (count > 0) {
      left.set(rule.key, count - 1);
    } else {
      kept.push(rule);
    }
    return kept;
  }, []);
};

const sameOrder = (left: readonly Placed[], right: readonly Placed[]): boolean => {
  const shared = without(right, without(right, left));

  return without(left, without(left, right)).every(
    (rule, index) => rule.key === shared[index]?.key,
  );
};

const woven = (
  spine: readonly Placed[],
  extras: readonly Placed[],
  source: readonly Placed[],
): Placed[] => {
  const result = [...spine];
  const extra = new Set(extras);
  let anchor = -1;

  for (const rule of source) {
    if (extra.has(rule)) {
      anchor += 1;
      result.splice(anchor, 0, rule);
      continue;
    }

    const found = result.findIndex((each, index) => index > anchor && each.key === rule.key);

    if (found < 0) {
continue;
}

anchor = found;
  }
  return result;
};

export const sameFormats = (
  left: readonly ConditionalFormat[],
  right: readonly ConditionalFormat[],
): boolean => left === right || JSON.stringify(left) === JSON.stringify(right);

export const patchFormats = (
  base: readonly ConditionalFormat[],
  mine: readonly ConditionalFormat[],
  theirs: readonly ConditionalFormat[],
): readonly ConditionalFormat[] => {
  if (sameFormats(theirs, base)) {
    return mine;
  }

  const before = placedOf(base);
  const own = placedOf(mine);
  const now = placedOf(theirs);

  return sameOrder(before, own)
    ? formatsOf(woven(without(now, without(before, own)), without(own, before), own))
    : formatsOf(woven(without(own, without(before, now)), without(now, before), now));
};
