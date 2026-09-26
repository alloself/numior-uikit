import { shallowRef, type ShallowRef } from 'vue';
import type { EntryState } from '../engine/engine';
import { patternOf } from '../paths/paths';
import type { FieldFlush, FieldRuleContext, ValidateOn } from './types';

export type EntryKind = 'field' | 'array' | 'group';

export interface Entry {
  readonly id: number;
  readonly kind: EntryKind;
  readonly path: () => string;
  readonly active: () => boolean;
  readonly disabled: () => boolean;
  readonly label: () => string | undefined;
  readonly element: () => HTMLElement | null | undefined;
  readonly focus: (() => void) | undefined;
  readonly flush: FieldFlush | undefined;
  readonly check: (context: FieldRuleContext) => string | undefined;
  readonly validateOn: ValidateOn;
  readonly keepValue: boolean;
  readonly state: EntryState;
  fieldEpoch: number;
}

export interface Registry {
  readonly entries: ShallowRef<readonly Entry[]>;
  readonly known: ReadonlySet<string>;
  add(entry: Entry): void;
  remove(entry: Entry): void;
  active(): Entry[];
  nextId(): number;
}

export const createRegistry = (): Registry => {
  const entries = shallowRef<readonly Entry[]>([]);
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
    active: () => entries.value.filter((entry) => entry.active()),
    nextId: () => {
      counter += 1;
      return counter;
    },
  };
};
