import type { Component } from 'vue';
import type {
  ControlOf,
  ControlProps,
  ControlValue,
  EmitsInto,
  NuiControlRegistry,
} from '@numior/primitives';
import type { KeepValue } from '../../paths/paths.types';
import type { FieldSelector } from '../../paths/selector';
import { adaptRule } from '../../rules/adapt-rule';
import type { AnyFieldRule } from '../../rules/async-rule';
import { liftEntry } from './lift';
import {
  NuiSmartFormEntryKind,
  type NuiSmartFormArray,
  type NuiSmartFormEntry,
  type NuiSmartFormField,
  type NuiSmartFormPropsFactory,
  type NuiSmartFormSection,
} from './smart-form.types';

export interface SmartFieldConfig<S, R, C, M extends string = 'modelValue'> extends Omit<
  NuiSmartFormField<S>,
  'kind' | 'component' | 'name' | 'model' | 'props' | 'rules' | 'keepValue'
> {
  readonly model?: M | undefined;
  readonly keepValue?: KeepValue<R> | undefined;
  readonly props?: ControlProps<C, M> | NuiSmartFormPropsFactory<S, ControlProps<C, M>> | undefined;
  readonly rules?: readonly AnyFieldRule<R, S>[] | undefined;
}

export interface SmartArrayConfig<S, Row> extends Omit<
  NuiSmartFormArray<S>,
  'kind' | 'name' | 'newRow' | 'rows'
> {
  readonly newRow: () => Row;
  readonly fields: readonly NuiSmartFormEntry<Row>[];
}

export interface FormConfigOptions<R extends NuiControlRegistry> {
  readonly controls?: R | undefined;
}

export type ControlFieldConfig<
  S,
  R extends NuiControlRegistry,
  K extends keyof R & string,
  V,
> = SmartFieldConfig<S, V, ControlOf<R, K>['component'], ControlOf<R, K>['model']>;

const fieldEntry = <S, R>(
  component: Component,
  name: FieldSelector<S, R>,
  config: SmartFieldConfig<S, R, Component, string>,
  model?: string,
): NuiSmartFormField<S> => {
  const { rules, ...rest } = config;

  return {
    ...rest,
    kind: NuiSmartFormEntryKind.Field,
    component,
    ...(model === undefined ? {} : { model }),
    name,
    rules: rules?.map((rule) =>
      adaptRule(rule, (_value: unknown, values: S) => [name(values), values] as const),
    ),
  };
};

export const formConfig = <S, R extends NuiControlRegistry = NuiControlRegistry>(
  options: FormConfigOptions<R> = {},
) => ({
  field: <C extends Component, V extends ControlValue<C, M>, M extends string = 'modelValue'>(
    component: C & EmitsInto<C, V, M>,
    name: FieldSelector<S, V>,
    config: SmartFieldConfig<S, V, C, M> = {},
  ): NuiSmartFormField<S> => fieldEntry(component, name, config),
  control: <K extends keyof R & string, V extends ControlOf<R, K>['value']>(
    key: K,
    name: FieldSelector<S, V>,
    config: ControlFieldConfig<S, R, K, V> = {},
  ): NuiSmartFormField<S> => {
    const entry = options.controls?.[key];

    if (entry === undefined) {
      throw new Error(`formConfig({ controls }) has no control named "${key}"`);
    }
    return fieldEntry(entry.component, name, config, entry.model);
  },
  section: (config: Omit<NuiSmartFormSection<S>, 'kind'>): NuiSmartFormSection<S> => ({
    ...config,
    kind: NuiSmartFormEntryKind.Section,
  }),
  array: <Row>(
    name: FieldSelector<S, readonly Row[] | undefined>,
    config: SmartArrayConfig<S, Row>,
  ): NuiSmartFormArray<S> => {
    const { fields, ...rest } = config;

    return {
      ...rest,
      kind: NuiSmartFormEntryKind.Array,
      name,
      rows: (row) => {
        const rowOf = (values: S): Row | undefined => {
          const current = row();
          return current === undefined ? undefined : name(values)?.[current.index];
        };

        return fields.map((entry) => liftEntry(entry, rowOf, row));
      },
    };
  },
});
