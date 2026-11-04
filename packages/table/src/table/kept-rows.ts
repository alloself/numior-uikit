import type { TableBodyRow } from './table.types';

const sameStyle = (
  left: Readonly<Record<string, string>> | undefined,
  right: Readonly<Record<string, string>> | undefined,
): boolean =>
  left === right ||
  (left !== undefined &&
    right !== undefined &&
    Object.keys(left).length === Object.keys(right).length &&
    Object.entries(left).every(([name, value]) => right[name] === value));

const FIELDS = [
  'index',
  'key',
  'node',
  'part',
  'revision',
  'frozen',
  'level',
  'treeLevel',
  'group',
  'expanded',
  'loading',
  'pending',
  'selected',
  'stripe',
] as const;

const sameRow = (left: TableBodyRow, right: TableBodyRow): boolean =>
  FIELDS.every((field) => left[field] === right[field]) && sameStyle(left.sized, right.sized);

export const keptRows = (
  next: readonly TableBodyRow[],
  previous: readonly TableBodyRow[] | undefined,
): readonly TableBodyRow[] => {
  if (previous === undefined) {
    return next;
  }

  const byKey = new Map(previous.map((row): [TableBodyRow['key'], TableBodyRow] => [row.key, row]));
  let kept = next.length === previous.length;

  const rows = next.map((row, index) => {
    const old = byKey.get(row.key);
    const same = old !== undefined && sameRow(old, row);

    kept &&= same && previous[index] === old;
    return same ? old : row;
  });

  return kept ? previous : rows;
};
