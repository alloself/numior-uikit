import type { NuiControlRegistry } from '@numior/primitives';
import type { ValidateOn } from '../../core/form.types';
import { NuiSmartFormEntryKind, type NuiSmartFormEntry } from './smart-form.types';

export type FormJsonRule =
  | {
      readonly rule: typeof FormJsonRuleName.Required | typeof FormJsonRuleName.Email;
      readonly message?: string | undefined;
    }
  | {
      readonly rule: typeof FormJsonRuleName.Min | typeof FormJsonRuleName.Max;
      readonly limit: number;
      readonly message?: string | undefined;
    }
  | {
      readonly rule: typeof FormJsonRuleName.Pattern;
      readonly source: string;
      readonly flags?: string | undefined;
      readonly message?: string | undefined;
    };

export type FormJsonCondition =
  | { readonly path: string; readonly equals: unknown }
  | { readonly path: string; readonly in: readonly unknown[] };

export interface FormJsonField {
  readonly kind: typeof NuiSmartFormEntryKind.Field;
  readonly type: string;
  readonly name: string;
  readonly label?: string | undefined;
  readonly description?: string | undefined;
  readonly required?: boolean | undefined;
  readonly disabled?: boolean | undefined;
  readonly readonly?: boolean | undefined;
  readonly group?: boolean | undefined;
  readonly area?: string | undefined;
  readonly props?: Readonly<Record<string, unknown>> | undefined;
  readonly when?: FormJsonCondition | undefined;
  readonly rules?: readonly FormJsonRule[] | undefined;
  readonly validateOn?: ValidateOn | undefined;
  readonly keepValue?: boolean | undefined;
}

export interface FormJsonSection {
  readonly kind: typeof NuiSmartFormEntryKind.Section;
  readonly name?: string | undefined;
  readonly title: string;
  readonly description?: string | undefined;
  readonly layout?: string | undefined;
  readonly area?: string | undefined;
  readonly when?: FormJsonCondition | undefined;
  readonly fields: readonly FormJsonEntry[];
}

export interface FormJsonArray {
  readonly kind: typeof NuiSmartFormEntryKind.Array;
  readonly name: string;
  readonly label?: string | undefined;
  readonly description?: string | undefined;
  readonly area?: string | undefined;
  readonly when?: FormJsonCondition | undefined;
  readonly layout?: string | undefined;
  readonly min?: number | undefined;
  readonly max?: number | undefined;
  readonly reorderable?: boolean | undefined;
  readonly newRow: Readonly<Record<string, unknown>>;
  readonly fields: readonly FormJsonEntry[];
  readonly addLabel?: string | undefined;
}

export type FormJsonEntry = FormJsonField | FormJsonSection | FormJsonArray;

export type FormConfigIssueCode = (typeof FormConfigIssueCode)[keyof typeof FormConfigIssueCode];

export interface FormConfigIssue {
  readonly path: string;
  readonly code: FormConfigIssueCode;
  readonly type?: string | undefined;
}

export interface ParseFormConfigOptions {
  readonly controls: NuiControlRegistry;
}

export type ParsedFormConfig<S extends object> =
  | {
      readonly kind: typeof FormConfigResultKind.Ok;
      readonly fields: readonly NuiSmartFormEntry<S>[];
    }
  | {
      readonly kind: typeof FormConfigResultKind.Error;
      readonly issues: readonly FormConfigIssue[];
    };

export const FormConfigIssueCode = {
  UnknownType: 'unknown-type',
  RejectedProps: 'rejected-props',
  NotAList: 'not-a-list',
  InvalidEntry: 'invalid-entry',
  InvalidPattern: 'invalid-pattern',
} as const;

export const FormJsonRuleName = {
  Required: 'required',
  Email: 'email',
  Min: 'min',
  Max: 'max',
  Pattern: 'pattern',
} as const;

export const FormConfigResultKind = { Ok: 'ok', Error: 'error' } as const;
