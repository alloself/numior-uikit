import {
  computed,
  onBeforeUnmount,
  reactive,
  toValue,
  unref,
  type ComputedRef,
  type MaybeRef,
  type MaybeRefOrGetter,
} from 'vue';
import type { FieldFlush, FieldMeta, FieldValidation, ValidateOn } from '../core/form.types';
import type { KeepValue } from '../paths/paths.types';
import { FORM_HOST, type FormContext } from '../form/form-context';
import { readSelected, recordPath, type FieldSelector } from '../paths/selector';
import { createRuleSet, type RuleSource } from './rule-set';
import { inertOf } from '../core/inert';
import { EntryKind } from '../core/core.types';

export interface UseFieldOptions<V extends object, R> {
  readonly form: FormContext<V>;
  readonly rules?: RuleSource<R, V>;
  readonly validateOn?: MaybeRefOrGetter<ValidateOn | undefined>;
  readonly debounce?: MaybeRefOrGetter<number | undefined>;
  readonly keepValue?: MaybeRefOrGetter<KeepValue<R> | undefined>;
  readonly label?: MaybeRefOrGetter<string | undefined>;
  readonly element?: MaybeRefOrGetter<HTMLElement | null | undefined>;
  readonly focus?: (() => void) | undefined;
  readonly flush?: FieldFlush<R> | undefined;
  readonly active?: MaybeRefOrGetter<boolean | undefined>;
  readonly disabled?: MaybeRefOrGetter<boolean | undefined>;
  readonly readonly?: MaybeRefOrGetter<boolean | undefined>;
}

export interface FieldBinding<R> {
  readonly modelValue: R;
  readonly 'onUpdate:modelValue': (value: R) => void;
  readonly onBlur: () => void;
}

export interface FormField<R> {
  readonly path: ComputedRef<string>;
  readonly value: ComputedRef<R>;
  readonly errorMessage: ComputedRef<string | undefined>;
  readonly errors: ComputedRef<readonly string[]>;
  readonly meta: FieldMeta;
  readonly binding: FieldBinding<R>;
  setValue(value: R): Promise<void>;
  handleBlur(): Promise<void>;
  validate(): Promise<FieldValidation>;
  guard(): (value: R) => boolean;
}

export const useField = <V extends object, R>(
  selector: MaybeRef<FieldSelector<V, R>>,
  options: UseFieldOptions<V, R>,
): FormField<R> => {
  const host = options.form[FORM_HOST];
  const { engine } = host;
  const select = computed(() => unref(selector));
  const path = computed(() => recordPath(engine.raw, select.value));
  const label = (): string | undefined => toValue(options.label);
  const state = engine.field(() => path.value, label);
  const rules = createRuleSet(options.rules);
  const value = computed(() => readSelected(engine.values, select.value, path.value));

  const entry = host.add({
    kind: EntryKind.Field,
    path: () => path.value,
    active: () => toValue(options.active) ?? true,
    inert: () => inertOf(options),
    label,
    element: () => toValue(options.element),
    focus: options.focus,
    flush: options.flush,
    value: () => value.value,
    check: (context) =>
      rules.check(readSelected(context.values, select.value, path.value), context),
    checkAsync: (context) =>
      rules.checkAsync(readSelected(context.values, select.value, path.value), context),
    hasAsync: () => rules.hasAsync(),
    debounce: () => toValue(options.debounce),
    validateOn: () => toValue(options.validateOn),
    keepValue: () => toValue(options.keepValue) ?? true,
    state,
  });

  rules.onChange(() => {
    void host.rulesChanged(entry);
  });

  const errors = computed(() => state.errors.value);

  const update = (next: R): Promise<void> => host.change(entry, next);
  const handleBlur = (): Promise<void> => host.blur(entry);

  onBeforeUnmount(() => {
    host.remove(entry);
  });

  return {
    path,
    value,
    errorMessage: computed(() => errors.value[0]),
    errors,
    meta: reactive({
      touched: state.touched,
      dirty: computed(() => host.isDirty(path.value)),
      valid: computed(() => errors.value.length === 0),
      pending: state.pending,
      validated: state.attempted,
    }),
    binding: reactive({ modelValue: value, 'onUpdate:modelValue': update, onBlur: handleBlur }),
    setValue: update,
    handleBlur,
    validate: () => host.validateEntry(entry),
    guard: () => host.guard(entry),
  };
};
