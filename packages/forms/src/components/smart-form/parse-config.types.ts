import type { NuiControlRegistry } from '@numior/primitives';
import type { ValidateOn } from '../../core/form.types';
import type { NuiSmartFormEntry } from './smart-form.types';

export type FormJsonRule =
  | { readonly rule: 'required' | 'email'; readonly message?: string | undefined }
  | { readonly rule: 'min' | 'max'; readonly limit: number; readonly message?: string | undefined }
  | {
      readonly rule: 'pattern';
      readonly source: string;
      readonly flags?: string | undefined;
      readonly message?: string | undefined;
    };

export type FormJsonCondition =
  | { readonly path: string; readonly equals: unknown }
  | { readonly path: string; readonly in: readonly unknown[] };

export interface FormJsonField {
  readonly kind: 'field';
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
  readonly kind: 'section';
  readonly name?: string | undefined;
  readonly title: string;
  readonly description?: string | undefined;
  readonly layout?: string | undefined;
  readonly area?: string | undefined;
  readonly when?: FormJsonCondition | undefined;
  readonly fields: readonly FormJsonEntry[];
}

export interface FormJsonArray {
  readonly kind: 'array';
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

export type FormConfigIssueCode =
  | 'unknown-type'
  | 'rejected-props'
  | 'not-a-list'
  | 'invalid-entry';

export interface FormConfigIssue {
  readonly path: string;
  readonly code: FormConfigIssueCode;
  readonly type?: string | undefined;
}

export interface ParseFormConfigOptions {
  readonly controls: NuiControlRegistry;
}

export type ParsedFormConfig<S extends object> =
  | { readonly kind: 'ok'; readonly fields: readonly NuiSmartFormEntry<S>[] }
  | { readonly kind: 'error'; readonly issues: readonly FormConfigIssue[] };
