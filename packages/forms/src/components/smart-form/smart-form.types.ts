import type { NuiStepperStatus } from '@numior/vue';
import type { Component } from 'vue';
import type { FormAfterSlotPath, FormSlotPath } from '../../paths/paths.types';
import type { FormMessage, ValidateOn } from '../../core/form.types';
import type { FieldArrayRow } from '../../field/use-field-array';
import type { FormContext } from '../../form/form-context';
import type { FieldSelector } from '../../paths/selector';
import type { AnyFieldRule } from '../../rules/async-rule';

export type SmartRow = FieldArrayRow<unknown>;

export type NuiSmartFormCondition<S> = (values: S, row: SmartRow | undefined) => boolean;

export type NuiSmartFormPropsFactory<S, P = object> = (values: S) => P;

export interface NuiSmartFormField<S> {
  readonly kind: 'field';
  readonly name: FieldSelector<S, unknown>;
  readonly component: Component;
  readonly model?: string | undefined;
  readonly props?: object | NuiSmartFormPropsFactory<S> | undefined;
  readonly label?: string | undefined;
  readonly description?: string | undefined;
  readonly required?: boolean | undefined;
  readonly disabled?: boolean | undefined;
  readonly group?: boolean | undefined;
  readonly area?: string | undefined;
  readonly when?: NuiSmartFormCondition<S> | undefined;
  readonly rules?: readonly AnyFieldRule<unknown, S>[] | undefined;
  readonly validateOn?: ValidateOn | undefined;
  readonly keepValue?: boolean | undefined;
}

export interface NuiSmartFormSection<S> {
  readonly kind: 'section';
  readonly name?: string | undefined;
  readonly title: string;
  readonly description?: string | undefined;
  readonly layout?: string | undefined;
  readonly area?: string | undefined;
  readonly when?: NuiSmartFormCondition<S> | undefined;
  readonly fields: readonly NuiSmartFormEntry<S>[];
}

export interface NuiSmartFormArray<S> {
  readonly kind: 'array';
  readonly name: FieldSelector<S, readonly unknown[] | undefined>;
  readonly label?: string | undefined;
  readonly description?: string | undefined;
  readonly area?: string | undefined;
  readonly when?: NuiSmartFormCondition<S> | undefined;
  readonly layout?: string | undefined;
  readonly min?: number | undefined;
  readonly max?: number | undefined;
  readonly reorderable?: boolean | undefined;
  readonly newRow: () => unknown;
  readonly rows: (row: () => SmartRow | undefined) => readonly NuiSmartFormEntry<S>[];
  readonly addLabel?: string | undefined;
  readonly removeLabel?: ((index: number) => string) | undefined;
  readonly moveLabel?: ((index: number) => string) | undefined;
}

export type NuiSmartFormEntry<S> =
  | NuiSmartFormField<S>
  | NuiSmartFormSection<S>
  | NuiSmartFormArray<S>;

export interface NuiSmartFormStep<S> {
  readonly value: string;
  readonly label: string;
  readonly description?: string | undefined;
  readonly layout?: string | undefined;
  readonly fields: readonly NuiSmartFormEntry<S>[];
}

export interface NuiSmartFormFieldScope {
  readonly error: string | undefined;
  readonly invalid: boolean;
  readonly touched: boolean;
  readonly pending: boolean;
  readonly row: SmartRow | undefined;
}

export interface NuiSmartFormAfterScope {
  readonly row: SmartRow | undefined;
}

export interface NuiSmartFormActionsScope {
  readonly pending: boolean;
  readonly dirty: boolean;
  readonly submit: () => void;
  readonly reset: () => void;
  readonly step: string | undefined;
  readonly first: boolean;
  readonly last: boolean;
  readonly back: () => void;
}

export type NuiSmartFormSlots<T extends object> = {
  [P in FormSlotPath<T>]?: (scope: NuiSmartFormFieldScope) => unknown;
} & {
  [P in FormAfterSlotPath<T>]?: (scope: NuiSmartFormAfterScope) => unknown;
} & {
  'form-errors'?: (scope: { readonly errors: readonly FormMessage[] }) => unknown;
  actions?: (scope: NuiSmartFormActionsScope) => unknown;
};

export interface NuiSmartFormProps<T extends object> {
  form: FormContext<T>;
  fields?: readonly NuiSmartFormEntry<T>[] | undefined;
  steps?: readonly NuiSmartFormStep<T>[] | undefined;
  layout?: string | undefined;
  inline?: boolean | 'grow' | undefined;
  disabled?: boolean | undefined;
  submitLabel?: string | undefined;
  nextLabel?: string | undefined;
  backLabel?: string | undefined;
}

export interface NuiSmartFormStepsProps<T extends object> {
  form: FormContext<T>;
  steps: readonly NuiSmartFormStep<T>[];
  current: number;
  statuses: readonly (NuiStepperStatus | undefined)[];
  live: string;
}

export interface NuiSmartFormEntriesProps<T extends object> {
  form: FormContext<T>;
  entries?: readonly NuiSmartFormEntry<T>[] | undefined;
  array?: NuiSmartFormArray<T> | undefined;
  layout?: string | undefined;
  prefix?: string | undefined;
  row?: SmartRow | undefined;
}

export interface NuiSmartFormCellProps<T extends object> {
  form: FormContext<T>;
  entry: NuiSmartFormField<T>;
  path: string;
  area: string;
  row?: SmartRow | undefined;
}
