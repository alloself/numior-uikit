import type { NuiOptionKey } from '../shared/options';
import type { CheckState } from '../tree/cascade';

export const toggleRow = <T>(
  selected: readonly T[],
  row: T,
  keyOf: NuiOptionKey<T>,
  multiple: boolean,
): T[] => {
  const key = keyOf(row);
  const has = selected.some((value) => keyOf(value) === key);
  if (!multiple) {
    return has ? [] : [row];
  }
  return has ? selected.filter((value) => keyOf(value) !== key) : [...selected, row];
};

export const toggleRows = <T>(
  selected: readonly T[],
  visible: readonly T[],
  keyOf: NuiOptionKey<T>,
): T[] => {
  const keys = new Set(selected.map(keyOf));
  if (visible.every((row) => keys.has(keyOf(row)))) {
    const visibleKeys = new Set(visible.map(keyOf));
    return selected.filter((value) => !visibleKeys.has(keyOf(value)));
  }
  return [...selected, ...visible.filter((row) => !keys.has(keyOf(row)))];
};

export const selectionStateOf = <T>(
  selectedKeys: ReadonlySet<string>,
  visible: readonly T[],
  keyOf: NuiOptionKey<T>,
): CheckState => {
  const count = visible.filter((row) => selectedKeys.has(keyOf(row))).length;
  if (count === 0) {
    return 'unchecked';
  }
  return count === visible.length ? 'checked' : 'indeterminate';
};
