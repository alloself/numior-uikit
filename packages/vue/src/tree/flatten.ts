import type { NuiOptionKey } from '../shared/options';
import type { NuiTreeItem } from './tree.types';

export interface TreeNode<T> {
  readonly item: NuiTreeItem<T>;
  readonly key: string;
  readonly level: number;
  readonly parentKey: string | undefined;
  readonly setSize: number;
  readonly posInSet: number;
  readonly hasChildren: boolean;
  readonly expanded: boolean;
  readonly loading: boolean;
}

const hasTreeChildren = <T>(item: NuiTreeItem<T>): boolean =>
  item.children === undefined ? item.lazy === true : item.children.length > 0;

const visit = <T>(
  items: readonly NuiTreeItem<T>[],
  level: number,
  parentKey: string | undefined,
  keyOf: NuiOptionKey<T>,
  expandedKeys: ReadonlySet<string>,
  pendingKeys: ReadonlySet<string>,
  out: TreeNode<T>[],
): void => {
  items.forEach((item, index) => {
    const key = keyOf(item.value);
    const hasChildren = hasTreeChildren(item);
    const expanded = hasChildren && expandedKeys.has(key);
    const loading = item.children === undefined && item.lazy === true && pendingKeys.has(key);

    out.push({
      item,
      key,
      level,
      parentKey,
      setSize: items.length,
      posInSet: index + 1,
      hasChildren,
      expanded,
      loading,
    });

    if (expanded && item.children) {
      visit(item.children, level + 1, key, keyOf, expandedKeys, pendingKeys, out);
    }
  });
};

export const flattenTree = <T>(
  items: readonly NuiTreeItem<T>[],
  keyOf: NuiOptionKey<T>,
  expandedKeys: ReadonlySet<string>,
  pendingKeys: ReadonlySet<string>,
): TreeNode<T>[] => {
  const out: TreeNode<T>[] = [];
  visit(items, 1, undefined, keyOf, expandedKeys, pendingKeys, out);
  return out;
};

export const findTreeItem = <T>(
  items: readonly NuiTreeItem<T>[],
  key: string,
  keyOf: NuiOptionKey<T>,
): NuiTreeItem<T> | undefined => {
  for (const item of items) {
    if (keyOf(item.value) === key) {
      return item;
    }
    const found = findTreeItem(item.children ?? [], key, keyOf);
    if (found) {
      return found;
    }
  }
  return undefined;
};

const collectAncestors = <T>(
  items: readonly NuiTreeItem<T>[],
  keys: ReadonlySet<string>,
  keyOf: NuiOptionKey<T>,
  path: readonly T[],
  out: Map<string, T>,
): void => {
  for (const item of items) {
    if (keys.has(keyOf(item.value))) {
      for (const ancestor of path) {
        out.set(keyOf(ancestor), ancestor);
      }
    }
    if (item.children) {
      collectAncestors(item.children, keys, keyOf, [...path, item.value], out);
    }
  }
};

export const ancestorValuesOf = <T>(
  items: readonly NuiTreeItem<T>[],
  keys: ReadonlySet<string>,
  keyOf: NuiOptionKey<T>,
): T[] => {
  const out = new Map<string, T>();
  collectAncestors(items, keys, keyOf, [], out);
  return [...out.values()];
};

export const parentIndexOf = <T>(nodes: readonly TreeNode<T>[], index: number): number => {
  const node = nodes[index];
  if (!node || node.parentKey === undefined) {
    return -1;
  }
  return nodes.findIndex((candidate) => candidate.key === node.parentKey);
};

export const firstChildIndexOf = <T>(nodes: readonly TreeNode<T>[], index: number): number => {
  const node = nodes[index];
  const next = nodes[index + 1];
  return node && next && next.parentKey === node.key ? index + 1 : -1;
};

export const siblingIndicesOf = <T>(nodes: readonly TreeNode<T>[], index: number): number[] => {
  const node = nodes[index];
  if (!node) {
    return [];
  }
  return nodes.flatMap((candidate, position) =>
    candidate.parentKey === node.parentKey && candidate.hasChildren && !candidate.item.disabled
      ? [position]
      : [],
  );
};
