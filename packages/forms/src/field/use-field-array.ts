import { computed, onBeforeUnmount, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import { createOwnerState } from '../core/owner-state';
import { firstFailure } from '../core/rules';
import type { FieldRule, ValidateOn } from '../core/types';
import type { FormContext } from '../form/form-context';
import { joinPath, normalizePath } from '../paths/paths';
import {
  firstAsyncFailure,
  isAsyncRule,
  isSyncRule,
  type AsyncFieldRule,
} from '../rules/async-rule';
import { resolveHost } from './use-field';

export interface FieldArrayRow<T> {
  readonly key: string;
  readonly index: number;
  readonly path: string;
  readonly value: T;
  readonly isFirst: boolean;
  readonly isLast: boolean;
}

export interface UseFieldArrayOptions<T> {
  readonly rules?: readonly (FieldRule<readonly T[]> | AsyncFieldRule<readonly T[]>)[] | undefined;
  readonly validateOn?: ValidateOn | undefined;
  readonly label?: MaybeRefOrGetter<string | undefined>;
  readonly element?: MaybeRefOrGetter<HTMLElement | null | undefined>;
  readonly focus?: (() => void) | undefined;
  readonly active?: MaybeRefOrGetter<boolean | undefined>;
  readonly disabled?: MaybeRefOrGetter<boolean | undefined>;
  readonly form?: FormContext | undefined;
}

export interface FieldArray<T> {
  readonly fields: ComputedRef<readonly FieldArrayRow<T>[]>;
  readonly errorMessage: ComputedRef<string | undefined>;
  readonly errors: ComputedRef<readonly string[]>;
  push(value: T): Promise<void>;
  prepend(value: T): Promise<void>;
  insert(index: number, value: T): Promise<void>;
  remove(index: number): Promise<void>;
  move(from: number, to: number): Promise<void>;
  swap(first: number, second: number): Promise<void>;
  replace(values: readonly T[]): Promise<void>;
  update(index: number, value: T): Promise<void>;
}

export const useFieldArray = <T = unknown>(
  path: MaybeRefOrGetter<string>,
  options: UseFieldArrayOptions<T> = {},
): FieldArray<T> => {
  const host = resolveHost(options.form);
  const arrayPath = computed(() => normalizePath(toValue(path)));
  const array = host.engine.array<T>(() => arrayPath.value);
  const state = createOwnerState();
  const items = (): T[] => array.rows.value.map((row) => row.value);
  const rules = options.rules ?? [];
  const syncRules = rules.filter(isSyncRule);
  const asyncRules = rules.filter(isAsyncRule);

  const entry = host.add({
    kind: 'array',
    path: () => arrayPath.value,
    active: () => toValue(options.active) ?? true,
    disabled: () => toValue(options.disabled) ?? false,
    label: () => toValue(options.label),
    element: () => toValue(options.element),
    focus: options.focus,
    flush: undefined,
    value: items,
    check: (context) => firstFailure(syncRules, items(), context),
    checkAsync:
      asyncRules.length === 0
        ? undefined
        : (context) => firstAsyncFailure(asyncRules, items(), context),
    debounce: undefined,
    validateOn: options.validateOn,
    keepValue: true,
    state,
  });

  const mutate = (change: () => void): Promise<void> => {
    change();
    return host.revalidate([entry], 'own');
  };

  onBeforeUnmount(() => {
    host.remove(entry);
  });

  return {
    fields: computed(() =>
      array.rows.value.map((row, index, rows) => ({
        key: String(row.key),
        index,
        path: joinPath(arrayPath.value, index),
        value: row.value,
        isFirst: index === 0,
        isLast: index === rows.length - 1,
      })),
    ),
    errorMessage: computed(() => state.errors.value[0]),
    errors: computed(() => state.errors.value),
    push: (value) => mutate(() => array.push(value)),
    prepend: (value) => mutate(() => array.prepend(value)),
    insert: (index, value) => mutate(() => array.insert(index, value)),
    remove: (index) => mutate(() => array.remove(index)),
    move: (from, to) => mutate(() => array.move(from, to)),
    swap: (first, second) => mutate(() => array.swap(first, second)),
    replace: (values) => mutate(() => array.replace(values)),
    update: (index, value) => host.write(joinPath(arrayPath.value, index), value),
  };
};
