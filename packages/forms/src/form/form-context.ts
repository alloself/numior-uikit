import { inject, provide, type ComputedRef, type InjectionKey, type MaybeRefOrGetter } from 'vue';
import type { FormHost } from '../core/host';
import type { EntryKind } from '../core/registry';
import type { FormRules } from '../core/rules';
import type { SubmitHandler } from '../core/submit';
import type { AnyFieldRule } from '../rules/async-rule';
import type {
  DeepPartial,
  FieldValidation,
  FormMessage,
  FormMeta,
  FormPath,
  FormPathValue,
  FormValues,
  ResetOptions,
  SubmitResult,
  ValidateOn,
  ValidateOptions,
  ValidationSummary,
} from '../core/types';
import type { StandardSchema } from '../schema/standard';

export interface UseFormOptions<V extends object, O = V> {
  readonly initialValues: V;
  readonly schema?: StandardSchema<unknown, O> | undefined;
  readonly rules?: FormRules<V> | undefined;
  readonly validateOn?: ValidateOn | undefined;
  readonly onSubmit: SubmitHandler<V, O>;
}

export interface RegisterOptions {
  readonly kind?: EntryKind | undefined;
  readonly active?: MaybeRefOrGetter<boolean | undefined>;
  readonly disabled?: MaybeRefOrGetter<boolean | undefined>;
  readonly keepValue?: boolean | undefined;
  readonly validateOn?: ValidateOn | undefined;
  readonly rules?: readonly AnyFieldRule[] | undefined;
  readonly debounce?: number | undefined;
  readonly label?: MaybeRefOrGetter<string | undefined>;
  readonly element?: MaybeRefOrGetter<HTMLElement | null | undefined>;
  readonly focus?: (() => void) | undefined;
}

export interface FieldRegistration {
  readonly id: number;
  unregister(): void;
}

export interface FormContext<V extends object = object> {
  readonly values: FormValues<V>;
  readonly errors: ComputedRef<Readonly<Record<string, string>>>;
  readonly errorBag: ComputedRef<Readonly<Record<string, readonly string[]>>>;
  readonly formErrors: ComputedRef<readonly FormMessage[]>;
  readonly touched: ComputedRef<Readonly<Record<string, boolean>>>;
  readonly meta: ComputedRef<FormMeta>;
  register(path: MaybeRefOrGetter<string>, options?: RegisterOptions): FieldRegistration;
  setFieldValue<P extends FormPath<V>>(path: P, value: FormPathValue<V, P>): Promise<void>;
  setValues(values: DeepPartial<V>): Promise<void>;
  setFieldError(path: string, message: string | readonly string[] | undefined): void;
  setErrors(errors: Readonly<Record<string, string | readonly string[] | undefined>>): void;
  setFormErrors(messages: readonly string[]): void;
  isFieldDirty(path: string): boolean;
  isFieldTouched(path: string): boolean;
  hasErrors(prefix?: string): boolean;
  errorsUnder(prefix: string): Readonly<Record<string, readonly string[]>>;
  firstInvalidPath(prefix?: string): string | undefined;
  focusField(path: string): boolean;
  validate(options?: ValidateOptions): Promise<ValidationSummary>;
  validateField(path: string): Promise<FieldValidation>;
  resetForm(options?: ResetOptions<V>): void;
  submit(event?: Event): Promise<SubmitResult>;
  settled(): Promise<void>;
}

export const FORM_KEY: InjectionKey<FormContext> = Symbol('nui:form');

const hosts = new WeakMap<FormContext, FormHost>();

export const bindHost = (form: FormContext, host: FormHost): void => {
  hosts.set(form, host);
};

export const hostOf = (form: FormContext): FormHost => {
  const host = hosts.get(form);

  if (!host) {
    throw new Error('the form was not created by useForm');
  }
  return host;
};

export const provideForm = (form: FormContext): void => {
  provide(FORM_KEY, form);
};

export const useFormContext = (): FormContext | null => inject(FORM_KEY, null);
