import {
  computed,
  inject,
  onBeforeUnmount,
  reactive,
  toValue,
  type ComputedRef,
  type MaybeRefOrGetter,
} from 'vue';
import type { FormHost } from '../core/host';
import { firstFailure } from '../core/rules';
import type { FieldFlush, FieldMeta, FieldRule, FieldValidation, ValidateOn } from '../core/types';
import { FORM_KEY, hostOf, type FormContext } from '../form/form-context';
import { normalizePath } from '../paths/paths';
import {
  firstAsyncFailure,
  isAsyncRule,
  isSyncRule,
  type AsyncFieldRule,
} from '../rules/async-rule';

export interface UseFieldOptions<T> {
  readonly rules?: readonly (FieldRule<T> | AsyncFieldRule<T>)[] | undefined;
  readonly validateOn?: ValidateOn | undefined;
  readonly debounce?: number | undefined;
  readonly keepValue?: boolean | undefined;
  readonly label?: MaybeRefOrGetter<string | undefined>;
  readonly element?: MaybeRefOrGetter<HTMLElement | null | undefined>;
  readonly focus?: (() => void) | undefined;
  readonly flush?: FieldFlush<T> | undefined;
  readonly active?: MaybeRefOrGetter<boolean | undefined>;
  readonly disabled?: MaybeRefOrGetter<boolean | undefined>;
  readonly form?: FormContext | undefined;
}

export interface FieldBinding<T> {
  readonly modelValue: T;
  readonly 'onUpdate:modelValue': (value: T) => void;
  readonly onBlur: () => void;
}

export interface FormField<T> {
  readonly path: ComputedRef<string>;
  readonly value: ComputedRef<T>;
  readonly errorMessage: ComputedRef<string | undefined>;
  readonly errors: ComputedRef<readonly string[]>;
  readonly meta: FieldMeta;
  readonly binding: FieldBinding<T>;
  setValue(value: T): Promise<void>;
  handleBlur(): Promise<void>;
  validate(): Promise<FieldValidation>;
  guard(): (value: T) => boolean;
}

export const resolveHost = (form: FormContext | undefined): FormHost => {
  const context = form ?? inject(FORM_KEY, null);

  if (!context) {
    throw new Error('a form field needs useForm in an ancestor or the form option');
  }
  return hostOf(context);
};

export const useField = <T = unknown>(
  path: MaybeRefOrGetter<string>,
  options: UseFieldOptions<T> = {},
): FormField<T> => {
  const host = resolveHost(options.form);
  const fieldPath = computed(() => normalizePath(toValue(path)));
  const label = (): string | undefined => toValue(options.label);
  const field = host.engine.field<T>(() => fieldPath.value, label);
  const rules = options.rules ?? [];
  const syncRules = rules.filter(isSyncRule);
  const asyncRules = rules.filter(isAsyncRule);

  const entry = host.add({
    kind: 'field',
    path: () => fieldPath.value,
    active: () => toValue(options.active) ?? true,
    disabled: () => toValue(options.disabled) ?? false,
    label,
    element: () => toValue(options.element),
    focus: options.focus,
    flush: options.flush,
    value: () => field.value.value,
    check: (context) => firstFailure(syncRules, field.value.value, context),
    checkAsync:
      asyncRules.length === 0
        ? undefined
        : (context) => firstAsyncFailure(asyncRules, field.value.value, context),
    debounce: options.debounce,
    validateOn: options.validateOn,
    keepValue: options.keepValue ?? true,
    state: field,
  });

  const value = computed(() => field.value.value);
  const errors = computed(() => field.errors.value);

  const setValue = (next: T): Promise<void> => host.change(entry, next);
  const handleBlur = (): Promise<void> => host.blur(entry);

  onBeforeUnmount(() => {
    host.remove(entry);
  });

  return {
    path: fieldPath,
    value,
    errorMessage: computed(() => errors.value[0]),
    errors,
    meta: reactive({
      touched: field.touched,
      dirty: computed(() => host.isDirty(fieldPath.value)),
      valid: computed(() => errors.value.length === 0),
      pending: field.pending,
      validated: field.attempted,
    }),
    binding: reactive({ modelValue: value, 'onUpdate:modelValue': setValue, onBlur: handleBlur }),
    setValue,
    handleBlur,
    validate: () => host.validateEntry(entry),
    guard: () => host.guard(entry),
  };
};
