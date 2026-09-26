import type { NuiStepperStatus } from '@numior/vue';
import type { Component } from 'vue';
import type { ValidateOn } from '../../core/types';
import type { FieldArrayRow } from '../../field/use-field-array';
import type { FormContext } from '../../form/form-context';
import type { AnyFieldRule } from '../../rules/async-rule';

type Bivariant<Args extends unknown[], R> = {
  bivarianceHack(...args: Args): R;
}['bivarianceHack'];

export type SmartRow = FieldArrayRow<unknown>;

export type NuiSmartFormCondition<S> = Bivariant<[values: S, row: SmartRow | undefined], boolean>;

export type NuiSmartFormPropsFactory<S, P = object> = Bivariant<[values: S], P>;

export interface NuiSmartFormField<S = unknown> {
  readonly kind: 'field';
  readonly name: string;
  readonly component: Component;
  readonly props?: object | NuiSmartFormPropsFactory<S> | undefined;
  readonly label?: string | undefined;
  readonly description?: string | undefined;
  readonly required?: boolean | undefined;
  readonly disabled?: boolean | undefined;
  readonly group?: boolean | undefined;
  readonly area?: string | undefined;
  readonly when?: NuiSmartFormCondition<S> | undefined;
  readonly rules?: readonly AnyFieldRule[] | undefined;
  readonly validateOn?: ValidateOn | undefined;
  readonly keepValue?: boolean | undefined;
}

export interface NuiSmartFormSection<S = unknown> {
  readonly kind: 'section';
  readonly name?: string | undefined;
  readonly title: string;
  readonly description?: string | undefined;
  readonly layout?: string | undefined;
  readonly area?: string | undefined;
  readonly when?: NuiSmartFormCondition<S> | undefined;
  readonly fields: readonly NuiSmartFormEntry<S>[];
}

export interface NuiSmartFormArray<S = unknown> {
  readonly kind: 'array';
  readonly name: string;
  readonly label?: string | undefined;
  readonly description?: string | undefined;
  readonly area?: string | undefined;
  readonly when?: NuiSmartFormCondition<S> | undefined;
  readonly layout?: string | undefined;
  readonly min?: number | undefined;
  readonly max?: number | undefined;
  readonly reorderable?: boolean | undefined;
  readonly newRow: () => unknown;
  readonly fields: readonly NuiSmartFormEntry[];
  readonly addLabel?: string | undefined;
  readonly removeLabel?: ((index: number) => string) | undefined;
  readonly moveLabel?: ((index: number) => string) | undefined;
}

export type NuiSmartFormEntry<S = unknown> =
  | NuiSmartFormField<S>
  | NuiSmartFormSection<S>
  | NuiSmartFormArray<S>;

export interface NuiSmartFormStep<S = unknown> {
  readonly value: string;
  readonly label: string;
  readonly description?: string | undefined;
  readonly layout?: string | undefined;
  readonly fields: readonly NuiSmartFormEntry<S>[];
}

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

export interface NuiSmartFormStepsProps {
  steps: readonly NuiSmartFormStep[];
  current: number;
  scope: SmartScope;
  statuses: readonly (NuiStepperStatus | undefined)[];
  live: string;
}

export interface SmartScope {
  readonly values: unknown;
  readonly prefix: string;
  readonly slotPrefix: string;
  readonly row: SmartRow | undefined;
}

export interface NuiSmartFormEntriesProps {
  entries: readonly NuiSmartFormEntry[];
  scope: SmartScope;
  layout?: string | undefined;
  declares?: boolean | undefined;
}

export interface NuiSmartFormCellProps {
  entry: NuiSmartFormField;
  scope: SmartScope;
}
