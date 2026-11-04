import { inject, provide, type ComputedRef, type InjectionKey, type MaybeRefOrGetter } from 'vue';
import type { FormHost } from '../core/host';
import type { EntryKind } from '../core/core.types';
import type { FormRules } from '../core/rules';
import type { SubmitHandler } from '../core/submit';
import type { DeepPartial, FormPath, FormPathValue } from '../paths/paths.types';
import type {
  FieldValidation,
  FormMessage,
  FormMeta,
  FormValues,
  ResetOptions,
  SubmitResult,
  ValidateOn,
  ValidateOptions,
  ValidationSummary,
} from '../core/form.types';
import type { FormEngineFactory } from '../engine/engine.types';
import type { AnyFieldRule } from '../rules/async-rule';
import type { StandardSchema } from '../schema/standard';

export interface UseFormOptions<V extends object, O = V> {
  readonly initialValues: V;
  readonly schema?: StandardSchema<unknown, O> | undefined;
  readonly rules?: FormRules<V> | undefined;
  readonly validateOn?: ValidateOn | undefined;
  readonly engine?: FormEngineFactory | undefined;
  readonly onSubmit: SubmitHandler<V, O>;
}

export interface RegisterOptions<V> {
  readonly kind?: EntryKind | undefined;
  readonly active?: MaybeRefOrGetter<boolean | undefined>;
  readonly disabled?: MaybeRefOrGetter<boolean | undefined>;
  readonly readonly?: MaybeRefOrGetter<boolean | undefined>;
  readonly keepValue?: MaybeRefOrGetter<boolean | undefined>;
  readonly validateOn?: MaybeRefOrGetter<ValidateOn | undefined>;
  readonly rules?: MaybeRefOrGetter<readonly AnyFieldRule<unknown, V>[] | undefined>;
  readonly debounce?: MaybeRefOrGetter<number | undefined>;
  readonly label?: MaybeRefOrGetter<string | undefined>;
  readonly element?: MaybeRefOrGetter<HTMLElement | null | undefined>;
  readonly focus?: (() => void) | undefined;
}

export interface FieldRegistration {
  readonly id: number;
  unregister(): void;
}

export interface FormResetOptions {
  readonly keepErrors?: boolean | undefined;
}

export interface FormHandle {
  readonly errors: ComputedRef<Readonly<Record<string, string>>>;
  readonly errorBag: ComputedRef<Readonly<Record<string, readonly string[]>>>;
  readonly formErrors: ComputedRef<readonly FormMessage[]>;
  readonly touched: ComputedRef<Readonly<Record<string, boolean>>>;
  readonly meta: ComputedRef<FormMeta>;
  register(path: MaybeRefOrGetter<string>, options?: RegisterOptions<unknown>): FieldRegistration;
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
  resetForm(options?: FormResetOptions): void;
  submit(event?: Event): Promise<SubmitResult>;
  settled(): Promise<void>;
}

export interface FormContext<V extends object> extends FormHandle {
  readonly [FORM_HOST]: FormHost<V>;
  readonly values: FormValues<V>;
  register(path: MaybeRefOrGetter<string>, options?: RegisterOptions<V>): FieldRegistration;
  setFieldValue<P extends FormPath<V>>(path: P, value: FormPathValue<V, P>): Promise<void>;
  setValues(values: DeepPartial<V>): Promise<void>;
  resetForm(options?: ResetOptions<V>): void;
}

export const FORM_HOST: unique symbol = Symbol('nui:form-host');

export const FORM_KEY: InjectionKey<FormHandle> = Symbol('nui:form');

export const provideForm = (form: FormHandle): void => {
  provide(FORM_KEY, form);
};

export const useFormContext = (): FormHandle | null => inject(FORM_KEY, null);
