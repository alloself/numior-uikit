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

export interface UseFieldOptions<T> {
  readonly rules?: readonly FieldRule<T>[] | undefined;
  readonly validateOn?: ValidateOn | undefined;
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

const resolveHost = (form: FormContext | undefined): FormHost => {
  const context = form ?? inject(FORM_KEY, null);

  if (!context) {
    throw new Error('useField needs a form: call useForm in an ancestor or pass the form option');
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

  const entry = host.add({
    kind: 'field',
    path: () => fieldPath.value,
    active: () => toValue(options.active) ?? true,
    disabled: () => toValue(options.disabled) ?? false,
    label,
    element: () => toValue(options.element),
    focus: options.focus,
    flush: options.flush,
    check: (context) => firstFailure(rules, field.value.value, context),
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
