import type { NuiOptionKey } from '../shared/options';

export interface NuiTableRowView<T> {
  readonly row: T;
  readonly key: string;
  readonly level: number;
  readonly parent: T | undefined;
  readonly parentKey: string | undefined;
  readonly hasChildren: boolean;
  readonly expanded: boolean;
  readonly loading: boolean;
  readonly siblingIndex: number;
  readonly siblingCount: number;
}

export interface FlattenRowsOptions<T> {
  readonly keyOf: NuiOptionKey<T>;
  readonly getChildren: ((row: T) => readonly T[] | undefined) | undefined;
  readonly isExpandable: ((row: T) => boolean) | undefined;
  readonly expandedKeys: ReadonlySet<string>;
  readonly pendingKeys: ReadonlySet<string>;
  readonly sortLevel: (rows: readonly T[]) => T[];
}

interface Frame<T> {
  readonly rows: readonly T[];
  readonly level: number;
  readonly parent: T | undefined;
  readonly parentKey: string | undefined;
}

const expandable = <T>(row: T, options: FlattenRowsOptions<T>): boolean => {
  if (options.isExpandable) {
    return options.isExpandable(row);
  }
  return (options.getChildren?.(row)?.length ?? 0) > 0;
};

const visit = <T>(
  frame: Frame<T>,
  options: FlattenRowsOptions<T>,
  out: NuiTableRowView<T>[],
): void => {
  const ordered = options.sortLevel(frame.rows);

  ordered.forEach((row, index) => {
    const key = options.keyOf(row);
    const children = options.getChildren?.(row);
    const hasChildren = expandable(row, options);
    const expanded = hasChildren && options.expandedKeys.has(key);

    out.push({
      row,
      key,
      level: frame.level,
      parent: frame.parent,
      parentKey: frame.parentKey,
      hasChildren,
      expanded,
      loading: hasChildren && children === undefined && options.pendingKeys.has(key),
      siblingIndex: index,
      siblingCount: ordered.length,
    });

    if (expanded && children) {
      visit({ rows: children, level: frame.level + 1, parent: row, parentKey: key }, options, out);
    }
  });
};

export const flattenRows = <T>(
  rows: readonly T[],
  options: FlattenRowsOptions<T>,
): NuiTableRowView<T>[] => {
  const out: NuiTableRowView<T>[] = [];
  visit({ rows, level: 0, parent: undefined, parentKey: undefined }, options, out);
  return out;
};

export const leafViews = <T>(rows: readonly T[], keyOf: NuiOptionKey<T>): NuiTableRowView<T>[] =>
  rows.map((row, index) => ({
    row,
    key: keyOf(row),
    level: 0,
    parent: undefined,
    parentKey: undefined,
    hasChildren: false,
    expanded: false,
    loading: false,
    siblingIndex: index,
    siblingCount: rows.length,
  }));
