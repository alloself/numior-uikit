import type { DeepReadonly, UnwrapNestedRefs } from 'vue';
import type { NuiFormRulesMessages } from '../rules/form-rules.messages';

export type ValidateOn = 'submit' | 'blur' | 'change';

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

export type SubmitStatus = 'submitted' | 'invalid' | 'rejected' | 'ignored' | 'aborted';

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

export type FormValues<V> = DeepReadonly<UnwrapNestedRefs<V>>;

type Leaf =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined
  | Date
  | Blob
  | ((...args: never[]) => unknown);

type Depth = [never, 0, 1, 2, 3, 4, 5, 6, 7];

type PathsOf<T, D extends number> = [D] extends [never]
  ? never
  : T extends Leaf
    ? never
    : T extends readonly (infer Item)[]
      ? `${number}` | `${number}.${PathsOf<NonNullable<Item>, Depth[D]>}`
      : {
          [K in keyof T & string]-?: K | `${K}.${PathsOf<NonNullable<T[K]>, Depth[D]>}`;
        }[keyof T & string];

export type FormPath<T> = string extends keyof T
  ? string
  : [keyof T] extends [never]
    ? string
    : PathsOf<T, 7>;

type SlotPathsOf<T, D extends number> = [D] extends [never]
  ? never
  : T extends Leaf
    ? never
    : T extends readonly (infer Item)[]
      ? SlotPathsOf<NonNullable<Item>, Depth[D]>
      : {
          [K in keyof T & string]-?: K | `${K}.${SlotPathsOf<NonNullable<T[K]>, Depth[D]>}`;
        }[keyof T & string];

export type FormSlotPath<T> = string extends FormPath<T> ? string : SlotPathsOf<T, 7>;

export type FormAfterSlotPath<T> =
  FormSlotPath<T> extends infer P extends string ? `${P}:after` : never;

type Child<T, K extends string> = T extends readonly (infer Item)[]
  ? K extends `${number}`
    ? Item
    : never
  : K extends keyof T
    ? T[K]
    : never;

export type FormPathValue<T, P extends string> = string extends P | FormPath<T>
  ? unknown
  : P extends `${infer Head}.${infer Rest}`
    ? FormPathValue<NonNullable<Child<T, Head>>, Rest>
    : Child<T, P>;

export type DeepPartial<T> = T extends Leaf | readonly unknown[]
  ? T
  : { [K in keyof T]?: DeepPartial<T[K]> };
