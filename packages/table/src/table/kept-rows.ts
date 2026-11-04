import { TableBodyRowViewKind, type TableBodyRow, type TableBodyRowView } from './table.types';

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

const sameEntries = (left: object, right: object): boolean => {
  const other = new Map(Object.entries(right));
  const entries = Object.entries(left);

  return (
    entries.length === other.size &&
    entries.every(([name, value]) => other.has(name) && other.get(name) === value)
  );
};

const sameView = <T>(left: TableBodyRowView<T>, right: TableBodyRowView<T>): boolean => {
  if (left.item !== right.item || !sameEntries(left.props, right.props)) {
    return false;
  }
  switch (left.kind) {
    case TableBodyRowViewKind.Row:
      return right.kind === TableBodyRowViewKind.Row;
    case TableBodyRowViewKind.Detail:
      return right.kind === TableBodyRowViewKind.Detail && sameEntries(left.scope, right.scope);
  }
};

export const keptViews = <T>(
  next: readonly TableBodyRowView<T>[],
  previous: readonly TableBodyRowView<T>[] | undefined,
): readonly TableBodyRowView<T>[] => {
  if (previous === undefined) {
    return next;
  }

  const byKey = new Map(
    previous.map((view): [TableBodyRow['key'], TableBodyRowView<T>] => [view.item.key, view]),
  );

  let kept = next.length === previous.length;

  const views = next.map((view, index) => {
    const old = byKey.get(view.item.key);
    const same = old !== undefined && sameView(old, view);

    kept &&= same && previous[index] === old;
    return same ? old : view;
  });

  return kept ? previous : views;
};
