import type { NuiOptionKey } from '../shared/options';
import { NuiCheckState, type NuiTreeItem } from './tree.types';

interface EnabledTally {
  readonly any: boolean;
  readonly all: boolean;
}

const pushEnabledDescendants = <T>(
  item: NuiTreeItem<T>,
  keyOf: NuiOptionKey<T>,
  out: string[],
): void => {
  for (const child of item.children ?? []) {
    if (child.disabled) {
      continue;
    }

    out.push(keyOf(child.value));
    pushEnabledDescendants(child, keyOf, out);
  }
};

const enabledDescendantKeys = <T>(item: NuiTreeItem<T>, keyOf: NuiOptionKey<T>): string[] => {
  const out: string[] = [];
  pushEnabledDescendants(item, keyOf, out);
  return out;
};

export const checkStates = <T>(
  items: readonly NuiTreeItem<T>[],
  checked: ReadonlySet<string>,
  keyOf: NuiOptionKey<T>,
): ReadonlyMap<string, NuiCheckState> => {
  const states = new Map<string, NuiCheckState>();

  const visit = (item: NuiTreeItem<T>): boolean => {
    const key = keyOf(item.value);
    let below = false;

    for (const child of item.children ?? []) {
      const marked = visit(child);

      if (!marked || child.disabled) {
        continue;
      }

      below = true;
    }

    const own = checked.has(key);

    states.set(
      key,
      own ? NuiCheckState.Checked : below ? NuiCheckState.Indeterminate : NuiCheckState.Unchecked,
    );

    return own || below;
  };

  for (const item of items) {
    visit(item);
  }
  return states;
};

const enabledTally = <T>(
  children: readonly NuiTreeItem<T>[],
  set: ReadonlySet<string>,
  keyOf: NuiOptionKey<T>,
): EnabledTally => {
  let any = false;

  for (const child of children) {
    if (child.disabled) {
      continue;
    }
    if (!set.has(keyOf(child.value))) {
      return { any: true, all: false };
    }
    any = true;
  }

  return { any, all: any };
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
    const enabled = enabledTally(item.children, set, keyOf);
    if (!enabled.any) {
      continue;
    }
    if (enabled.all) {
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

export const completeChecked = <T>(
  items: readonly NuiTreeItem<T>[],
  checked: ReadonlySet<string>,
  keyOf: NuiOptionKey<T>,
): Set<string> => {
  const next = new Set(checked);

  const visit = (item: NuiTreeItem<T>): void => {
    if (next.has(keyOf(item.value))) {
      for (const key of enabledDescendantKeys(item, keyOf)) {
        next.add(key);
      }
    }
    for (const child of item.children ?? []) {
      visit(child);
    }
  };

  for (const item of items) {
    visit(item);
  }
  normalize(items, next, keyOf);
  return next;
};

export const sameKeys = (left: ReadonlySet<string>, right: ReadonlySet<string>): boolean =>
  left.size === right.size && [...left].every((key) => right.has(key));

const pushChecked = <T>(
  items: readonly NuiTreeItem<T>[],
  checked: ReadonlySet<string>,
  keyOf: NuiOptionKey<T>,
  out: T[],
): void => {
  for (const item of items) {
    if (checked.has(keyOf(item.value))) {
      out.push(item.value);
    }
    pushChecked(item.children ?? [], checked, keyOf, out);
  }
};

export const collectCheckedValues = <T>(
  items: readonly NuiTreeItem<T>[],
  checked: ReadonlySet<string>,
  keyOf: NuiOptionKey<T>,
): T[] => {
  const out: T[] = [];
  pushChecked(items, checked, keyOf, out);
  return out;
};
