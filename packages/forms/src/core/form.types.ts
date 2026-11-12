import type { DeepReadonly, Reactive, UnwrapNestedRefs } from 'vue';
import type { NuiFormRulesMessages } from '../rules/form-rules.messages';

export type ValidateOn = (typeof ValidateOn)[keyof typeof ValidateOn];

export interface FieldRuleContext<V = unknown> {
  readonly name: string;
  readonly label: string | undefined;
  readonly values: V;
  readonly messages: NuiFormRulesMessages;
}

export interface AsyncRuleContext<V = unknown> extends FieldRuleContext<V> {
  readonly signal: AbortSignal;
}

export type FieldRule<T = unknown, V = unknown> = (
  value: T,
  context: FieldRuleContext<V>,
) => true | string;

export type CheckErrorHandler = (error: unknown, path: string) => void;

export type FieldFlush<T = unknown> = (commit: (value: T) => boolean) => Promise<void> | void;

export interface FormMessage {
  readonly path: string | undefined;
  readonly message: string;
}

export interface FormMeta {
  readonly valid: boolean;
  readonly dirty: boolean;
  readonly touched: boolean;
  readonly pending: boolean;
  readonly submitCount: number;
  readonly submitted: boolean;
}

export interface FieldMeta {
  readonly touched: boolean;
  readonly dirty: boolean;
  readonly valid: boolean;
  readonly pending: boolean;
  readonly validated: boolean;
}

export type SubmitStatus = (typeof SubmitStatus)[keyof typeof SubmitStatus];

export interface SubmitResult {
  readonly status: SubmitStatus;
  readonly invalid: readonly string[];
  readonly formErrors: readonly FormMessage[];
}

export interface ValidateOptions {
  readonly paths?: readonly string[] | undefined;
  readonly silent?: boolean | undefined;
}

export interface ValidationSummary {
  readonly valid: boolean;
  readonly errors: Readonly<Record<string, readonly string[]>>;
  readonly formErrors: readonly FormMessage[];
  readonly ignored: readonly string[];
}

export interface FieldValidation {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export interface ResetOptions<V> {
  readonly values?: V | undefined;
  readonly keepErrors?: boolean | undefined;
}

export type FormValues<V> = DeepReadonly<UnwrapNestedRefs<Reactive<V>>>;

export const ValidateOn = { Submit: 'submit', Blur: 'blur', Change: 'change' } as const;

export const SubmitStatus = {
  Submitted: 'submitted',
  Invalid: 'invalid',
  Rejected: 'rejected',
  Ignored: 'ignored',
  Aborted: 'aborted',
} as const;
