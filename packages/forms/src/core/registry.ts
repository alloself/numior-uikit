import { computed, shallowRef } from 'vue';
import type { EntryState } from '../engine/engine.types';
import { patternOf, prefixesOf } from '../paths/paths';
import type { AsyncRuleContext, FieldFlush, FieldRuleContext, ValidateOn } from './form.types';

export type EntryKind = 'field' | 'array' | 'group';

export interface Entry<V extends object> {
  readonly id: number;
  readonly kind: EntryKind;
  readonly path: () => string;
  readonly active: () => boolean;
  readonly inert: () => boolean;
  readonly label: () => string | undefined;
  readonly element: () => HTMLElement | null | undefined;
  readonly focus: (() => void) | undefined;
  readonly flush: FieldFlush | undefined;
  readonly value: () => unknown;
  readonly check: (context: FieldRuleContext<V>) => string | undefined;
  readonly checkAsync: (context: AsyncRuleContext<V>) => Promise<string | undefined>;
  readonly hasAsync: () => boolean;
  readonly debounce: () => number;
  readonly validateOn: () => ValidateOn;
  readonly keepValue: () => boolean;
  readonly state: EntryState;
  fieldEpoch: number;
}

export type AnyEntry = Entry<never>;

export interface RegistryIndex<V extends object> {
  readonly active: readonly Entry<V>[];
  readonly byPath: ReadonlyMap<string, readonly Entry<V>[]>;
  readonly covered: ReadonlySet<string>;
  readonly patterns: ReadonlySet<string>;
}

export type AnyIndex = RegistryIndex<never>;

export interface Registry<V extends object> {
  readonly known: ReadonlySet<string>;
  all(): ReadonlySet<Entry<V>>;
  add(entry: Entry<V>): void;
  remove(entry: Entry<V>): void;
  index(): RegistryIndex<V>;
  active(): readonly Entry<V>[];
  claimed(path: string, except: Entry<V>): boolean;
  nextId(): number;
}

interface Placed<V extends object> {
  readonly entry: Entry<V>;
  readonly path: string;
  readonly active: boolean;
}

const insideInactive = (path: string, inactive: ReadonlySet<string>): boolean =>
  prefixesOf(path).some((prefix) => prefix !== path && inactive.has(prefix));

const collect = <V extends object>(placed: readonly Placed<V>[]): RegistryIndex<V> => {
  const inactive = new Set(placed.filter((item) => !item.active).map((item) => item.path));
  const active: Entry<V>[] = [];
  const byPath = new Map<string, Entry<V>[]>();
  const covered = new Set<string>();
  const patterns = new Set<string>();

  for (const item of placed) {
    patterns.add(patternOf(item.path));

    if (!item.active || insideInactive(item.path, inactive)) {
      continue;
    }
    active.push(item.entry);
    byPath.set(item.path, [...(byPath.get(item.path) ?? []), item.entry]);

    for (const prefix of prefixesOf(item.path)) {
      covered.add(prefix);
    }
  }
  return { active, byPath, covered, patterns };
};

export const createRegistry = <V extends object>(): Registry<V> => {
  const entries = new Set<Entry<V>>();
  const known = new Set<string>();
  const version = shallowRef(0);
  let counter = 0;

  const index = computed(() => {
    void version.value;

    return collect(
      [...entries].map((entry) => ({ entry, path: entry.path(), active: entry.active() })),
    );
  });

  return {
    known,
    all: () => entries,
    add: (entry) => {
      known.add(patternOf(entry.path()));
      entries.add(entry);
      version.value += 1;
    },
    remove: (entry) => {
      entries.delete(entry);
      version.value += 1;
    },
    index: () => index.value,
    active: () => index.value.active,
    claimed: (path, except) =>
      (index.value.byPath.get(path) ?? []).some((entry) => entry !== except),
    nextId: () => {
      counter += 1;
      return counter;
    },
  };
};
