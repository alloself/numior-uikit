import type { IconAlias } from '@numior/primitives';

export interface NuiOption<T = string> {
  readonly value: T;
  readonly label: string;
  readonly description?: string | undefined;
  readonly disabled?: boolean | undefined;
  readonly icon?: IconAlias | undefined;
}

export interface NuiOptionGroup<T = string> {
  readonly label: string;
  readonly options: readonly NuiOption<T>[];
}

export type NuiOptionSource<T = string> = ReadonlyArray<NuiOption<T> | NuiOptionGroup<T>>;

export type NuiOptionKey<T> = (value: T) => string;

export interface OptionEntry<T> {
  readonly option: NuiOption<T>;
  readonly index: number;
}

export interface OptionGroupView<T> {
  readonly label: string | undefined;
  readonly entries: readonly OptionEntry<T>[];
}

const isOptionGroup = <T>(entry: NuiOption<T> | NuiOptionGroup<T>): entry is NuiOptionGroup<T> =>
  'options' in entry;

export const flattenOptions = <T>(source: NuiOptionSource<T>): NuiOption<T>[] =>
  source.flatMap((entry) => (isOptionGroup(entry) ? [...entry.options] : [entry]));

export const defaultOptionKey = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  return JSON.stringify(value) ?? '';
};

export const groupOptions = <T>(source: NuiOptionSource<T>): OptionGroupView<T>[] => {
  const groups: Array<{ label: string | undefined; entries: OptionEntry<T>[] }> = [];
  let index = 0;
  for (const entry of source) {
    if (isOptionGroup(entry)) {
      groups.push({
        label: entry.label,
        entries: entry.options.map((option) => ({ option, index: index++ })),
      });
      continue;
    }
    const last = groups.at(-1);
    const target = last && last.label === undefined ? last : { label: undefined, entries: [] };
    if (target !== last) {
      groups.push(target);
    }
    target.entries.push({ option: entry, index: index++ });
  }
  return groups;
};
