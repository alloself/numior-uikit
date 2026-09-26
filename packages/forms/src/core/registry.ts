import { shallowRef, type ShallowRef } from 'vue';
import type { EntryState } from '../engine/engine.types';
import { isUnder, patternOf } from '../paths/paths';
import type { AsyncRuleContext, FieldFlush, FieldRuleContext, ValidateOn } from './types';

export type EntryKind = 'field' | 'array' | 'group';

export interface Entry<V extends object> {
  readonly id: number;
  readonly kind: EntryKind;
  readonly path: () => string;
  readonly active: () => boolean;
  readonly disabled: () => boolean;
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

export interface Registry<V extends object> {
  readonly entries: ShallowRef<readonly Entry<V>[]>;
  readonly known: ReadonlySet<string>;
  add(entry: Entry<V>): void;
  remove(entry: Entry<V>): void;
  active(): Entry<V>[];
  nextId(): number;
}

const insideAny = (path: string, containers: readonly string[]): boolean =>
  containers.some((container) => path !== container && isUnder(path, container));

export const createRegistry = <V extends object>(): Registry<V> => {
  const entries = shallowRef<readonly Entry<V>[]>([]);
  const known = new Set<string>();
  let counter = 0;

  return {
    entries,
    known,
    add: (entry) => {
      known.add(patternOf(entry.path()));
      entries.value = [...entries.value, entry];
    },
    remove: (entry) => {
      entries.value = entries.value.filter((item) => item !== entry);
    },
    active: () => {
      const inactive = entries.value
        .filter((entry) => !entry.active())
        .map((entry) => entry.path());

      return entries.value.filter((entry) => entry.active() && !insideAny(entry.path(), inactive));
    },
    nextId: () => {
      counter += 1;
      return counter;
    },
  };
};
