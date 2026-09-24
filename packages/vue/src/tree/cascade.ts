import type { NuiOptionKey } from '../shared/options';
import type { NuiTreeItem } from './tree.types';

export type CheckState = 'checked' | 'unchecked' | 'indeterminate';

const pushEnabledDescendants = <T>(
  item: NuiTreeItem<T>,
  keyOf: NuiOptionKey<T>,
  out: string[],
): void => {
  for (const child of item.children ?? []) {
    if (!child.disabled) {
      out.push(keyOf(child.value));
      pushEnabledDescendants(child, keyOf, out);
    }
  }
};

const enabledDescendantKeys = <T>(item: NuiTreeItem<T>, keyOf: NuiOptionKey<T>): string[] => {
  const out: string[] = [];
  pushEnabledDescendants(item, keyOf, out);
  return out;
};

export const checkStateOf = <T>(
  item: NuiTreeItem<T>,
  checked: ReadonlySet<string>,
  keyOf: NuiOptionKey<T>,
): CheckState => {
  if (checked.has(keyOf(item.value))) {
    return 'checked';
  }
  return enabledDescendantKeys(item, keyOf).some((key) => checked.has(key))
    ? 'indeterminate'
    : 'unchecked';
};

const normalize = <T>(
  items: readonly NuiTreeItem<T>[],
  set: Set<string>,
  keyOf: NuiOptionKey<T>,
): void => {
  for (const item of items) {
    if (item.disabled || !item.children) {
      continue;
    }
    normalize(item.children, set, keyOf);
    const enabled = item.children.filter((child) => !child.disabled);
    if (enabled.length === 0) {
      continue;
    }
    if (enabled.every((child) => set.has(keyOf(child.value)))) {
      set.add(keyOf(item.value));
    } else {
      set.delete(keyOf(item.value));
    }
  }
};

export const applyCheck = <T>(
  items: readonly NuiTreeItem<T>[],
  checked: ReadonlySet<string>,
  target: NuiTreeItem<T>,
  keyOf: NuiOptionKey<T>,
): Set<string> => {
  const next = new Set(checked);
  const key = keyOf(target.value);
  const on = !next.has(key);
  for (const affected of [key, ...enabledDescendantKeys(target, keyOf)]) {
    if (on) {
      next.add(affected);
    } else {
      next.delete(affected);
    }
  }
  normalize(items, next, keyOf);
  return next;
};

export const collectCheckedValues = <T>(
  items: readonly NuiTreeItem<T>[],
  checked: ReadonlySet<string>,
  keyOf: NuiOptionKey<T>,
): T[] =>
  items.flatMap((item) => [
    ...(checked.has(keyOf(item.value)) ? [item.value] : []),
    ...collectCheckedValues(item.children ?? [], checked, keyOf),
  ]);
