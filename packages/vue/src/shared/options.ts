import type { NuiRouteLocation } from './destination';
import type { IconSource } from '@numior/primitives';

export interface NuiListEntry<T = string> {
  readonly key?: string | undefined;
  readonly value?: T | undefined;
  readonly label: string;
  readonly description?: string | undefined;
  readonly icon?: IconSource | false | undefined;
  readonly disabled?: boolean | undefined;
  readonly href?: string | undefined;
  readonly to?: NuiRouteLocation | undefined;
  readonly current?: boolean | undefined;
  readonly badge?: string | number | undefined;
  readonly shortcut?: string | undefined;
  readonly onClick?: (() => void) | undefined;
}

export interface NuiOption<T = string> extends NuiListEntry<T> {
  readonly value: T;
  readonly children?: readonly NuiOption<T>[] | undefined;
}

export interface NuiListGroup<E> {
  readonly label: string;
  readonly items: readonly E[];
}

export type NuiListSource<E> = ReadonlyArray<E | NuiListGroup<E>>;

export type NuiOptionGroup<T = string> = NuiListGroup<NuiOption<T>>;

export type NuiOptionSource<T = string> = NuiListSource<NuiOption<T>>;

export type NuiOptionKey<T> = (value: T) => string;

export const isListGroup = <E>(entry: E | NuiListGroup<E>): entry is NuiListGroup<E> =>
  typeof entry === 'object' && entry !== null && 'items' in entry && Array.isArray(entry.items);

export const flattenEntries = <E>(source: NuiListSource<E>): E[] =>
  source.flatMap((entry) => (isListGroup(entry) ? [...entry.items] : [entry]));

const withDescendants = <T>(option: NuiOption<T>): NuiOption<T>[] => [
  option,
  ...(option.children ?? []).flatMap(withDescendants),
];

export const flattenOptions = <T>(source: NuiOptionSource<T>): NuiOption<T>[] =>
  source.flatMap((entry) =>
    isListGroup(entry) ? entry.items.flatMap(withDescendants) : withDescendants(entry),
  );

interface EntryGroup<E> {
  readonly label: string | undefined;
  readonly items: readonly E[];
}

export const groupEntries = <E>(source: NuiListSource<E>): EntryGroup<E>[] => {
  const groups: Array<{ label: string | undefined; items: E[] }> = [];
  for (const entry of source) {
    if (isListGroup(entry)) {
      groups.push({ label: entry.label, items: [...entry.items] });
      continue;
    }
    const last = groups.at(-1);
    if (last && last.label === undefined) {
      last.items.push(entry);
    } else {
      groups.push({ label: undefined, items: [entry] });
    }
  }
  return groups;
};

export const filterOptions = <E>(
  source: NuiListSource<E>,
  keep: (entry: E) => boolean,
): NuiListSource<E> =>
  source.flatMap((entry): Array<E | NuiListGroup<E>> => {
    if (!isListGroup(entry)) {
      return keep(entry) ? [entry] : [];
    }
    const items = entry.items.filter(keep);
    return items.length === 0 ? [] : [{ label: entry.label, items }];
  });

export const defaultOptionKey = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  return JSON.stringify(value) ?? '';
};

export const optionElementId = (listId: string, index: number): string =>
  `${listId}-option-${index}`;

export const optionIndexOf = (element: Element): number =>
  Number(element.id.slice(element.id.lastIndexOf('-') + 1));
