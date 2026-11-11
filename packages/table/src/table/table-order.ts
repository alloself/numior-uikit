import type { NuiTableColumn } from './table.types';

export const orderLeaves = <T>(
  leaves: readonly NuiTableColumn<T>[],
  order: readonly string[],
): NuiTableColumn<T>[] => {
  const byKey = new Map(leaves.map((leaf) => [leaf.key, leaf]));
  const placed = new Set<string>();
  const ordered: NuiTableColumn<T>[] = [];

  for (const key of order) {
    const leaf = byKey.get(key);

    if (leaf === undefined || placed.has(key)) {
      continue;
    }

    placed.add(key);
    ordered.push(leaf);
  }
  return [...ordered, ...leaves.filter((leaf) => !placed.has(leaf.key))];
};

export const movedKeys = (
  keys: readonly string[],
  from: string,
  to: string,
  after: boolean,
): string[] => {
  if (from === to || !keys.includes(from) || !keys.includes(to)) {
    return [...keys];
  }
  const rest = keys.filter((key) => key !== from);
  const index = rest.indexOf(to) + (after ? 1 : 0);

  return [...rest.slice(0, index), from, ...rest.slice(index)];
};
