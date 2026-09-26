import {
  computed,
  onBeforeUnmount,
  toValue,
  unref,
  type ComputedRef,
  type MaybeRef,
  type MaybeRefOrGetter,
} from 'vue';
import { createOwnerState } from '../core/owner-state';
import type { ValidateOn } from '../core/types';
import { FORM_HOST, type FormContext } from '../form/form-context';
import { joinPath } from '../paths/paths';
import { readSelected, recordPath, type FieldSelector } from '../paths/selector';
import { createRuleSet, type RuleSource } from './rule-set';

export interface FieldArrayRow<Row> {
  readonly key: string;
  readonly index: number;
  readonly path: string;
  readonly value: Row;
  readonly isFirst: boolean;
  readonly isLast: boolean;
}

export interface UseFieldArrayOptions<V extends object, Row> {
  readonly form: FormContext<V>;
  readonly rules?: RuleSource<readonly Row[], V>;
  readonly validateOn?: MaybeRefOrGetter<ValidateOn | undefined>;
  readonly label?: MaybeRefOrGetter<string | undefined>;
  readonly element?: MaybeRefOrGetter<HTMLElement | null | undefined>;
  readonly focus?: (() => void) | undefined;
  readonly active?: MaybeRefOrGetter<boolean | undefined>;
  readonly disabled?: MaybeRefOrGetter<boolean | undefined>;
}

export interface FieldArray<Row> {
  readonly path: ComputedRef<string>;
  readonly fields: ComputedRef<readonly FieldArrayRow<Row>[]>;
  readonly errorMessage: ComputedRef<string | undefined>;
  readonly errors: ComputedRef<readonly string[]>;
  push(value: Row): Promise<void>;
  prepend(value: Row): Promise<void>;
  insert(index: number, value: Row): Promise<void>;
  remove(index: number): Promise<void>;
  move(from: number, to: number): Promise<void>;
  swap(first: number, second: number): Promise<void>;
  replace(values: readonly Row[]): Promise<void>;
  update(index: number, value: Row): Promise<void>;
}

export const useFieldArray = <V extends object, Row>(
  selector: MaybeRef<FieldSelector<V, readonly Row[] | undefined>>,
  options: UseFieldArrayOptions<V, Row>,
): FieldArray<Row> => {
  const host = options.form[FORM_HOST];
  const { engine } = host;
  const select = computed(() => unref(selector));
  const path = computed(() => recordPath(engine.raw, select.value));
  const array = engine.array(() => path.value);
  const state = createOwnerState();
  const rules = createRuleSet(options.rules);

  const items = (values: V): readonly Row[] => readSelected(values, select.value, path.value) ?? [];

  const list = computed(() => items(engine.values));

  const entry = host.add({
    kind: 'array',
    path: () => path.value,
    active: () => toValue(options.active) ?? true,
    disabled: () => toValue(options.disabled) ?? false,
    label: () => toValue(options.label),
    element: () => toValue(options.element),
    focus: options.focus,
    flush: undefined,
    value: () => items(engine.raw),
    check: (context) => rules.check(items(context.values), context),
    checkAsync: (context) => rules.checkAsync(items(context.values), context),
    hasAsync: rules.hasAsync,
    debounce: () => undefined,
    validateOn: () => toValue(options.validateOn),
    keepValue: () => true,
    state,
  });

  rules.onChange(() => {
    void host.rulesChanged(entry);
  });

  const mutate = (change: () => void): Promise<void> => {
    change();
    return host.revalidate([entry], 'own');
  };

  onBeforeUnmount(() => {
    host.remove(entry);
  });

  return {
    path,
    fields: computed(() => {
      const keys = array.keys.value;
      const rows = list.value;

      return rows.map((value, index) => ({
        key: String(keys[index] ?? `${path.value}.${index}`),
        index,
        path: joinPath(path.value, index),
        value,
        isFirst: index === 0,
        isLast: index === rows.length - 1,
      }));
    }),
    errorMessage: computed(() => state.errors.value[0]),
    errors: computed(() => state.errors.value),
    push: (value) => mutate(() => array.push(value)),
    prepend: (value) => mutate(() => array.prepend(value)),
    insert: (index, value) => mutate(() => array.insert(index, value)),
    remove: (index) => mutate(() => array.remove(index)),
    move: (from, to) => mutate(() => array.move(from, to)),
    swap: (first, second) => mutate(() => array.swap(first, second)),
    replace: (values) => mutate(() => array.replace(values)),
    update: (index, value) => host.write(joinPath(path.value, index), value),
  };
};
