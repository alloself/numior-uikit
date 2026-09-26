import type { Component, InputHTMLAttributes } from 'vue';
import type { FieldSelector } from '../../paths/selector';
import { adaptRule } from '../../rules/adapt-rule';
import type { AnyFieldRule } from '../../rules/async-rule';
import { liftEntry } from './lift';
import type {
  NuiSmartFormArray,
  NuiSmartFormEntry,
  NuiSmartFormField,
  NuiSmartFormPropsFactory,
  NuiSmartFormSection,
} from './smart-form.types';

type ComponentProps<C> = C extends new (...args: never[]) => { $props: infer P }
  ? P
  : C extends (props: infer P, ...args: never[]) => unknown
    ? P
    : object;

type ControlKeys =
  | 'modelValue'
  | 'onUpdate:modelValue'
  | 'id'
  | 'name'
  | 'invalid'
  | 'required'
  | 'disabled';

export type ControlProps<C> = Omit<ComponentProps<C>, ControlKeys> &
  Omit<InputHTMLAttributes, ControlKeys | 'value'>;

export type ControlValue<C> =
  ComponentProps<C> extends { readonly modelValue: infer M }
    ? M
    : ComponentProps<C> extends { readonly modelValue?: infer M }
      ? M | undefined
      : unknown;

type ControlEmit<C> =
  ComponentProps<C> extends {
    readonly 'onUpdate:modelValue'?: (value: infer E) => unknown;
  }
    ? E
    : unknown;

type EmitsInto<C, R> =
  unknown extends ControlEmit<C>
    ? unknown
    : [ControlEmit<C>] extends [R]
      ? unknown
      : { readonly updateModelValue: ControlEmit<C> };

export interface SmartFieldConfig<S, R, C> extends Omit<
  NuiSmartFormField<S>,
  'kind' | 'component' | 'name' | 'props' | 'rules'
> {
  readonly props?: ControlProps<C> | NuiSmartFormPropsFactory<S, ControlProps<C>> | undefined;
  readonly rules?: readonly AnyFieldRule<R, S>[] | undefined;
}

export interface SmartArrayConfig<S, Row> extends Omit<
  NuiSmartFormArray<S>,
  'kind' | 'name' | 'newRow' | 'rows'
> {
  readonly newRow: () => Row;
  readonly fields: readonly NuiSmartFormEntry<Row>[];
}

export const formConfig = <S>() => ({
  field: <C extends Component, R extends ControlValue<C>>(
    component: C & EmitsInto<C, R>,
    name: FieldSelector<S, R>,
    config: SmartFieldConfig<S, R, C> = {},
  ): NuiSmartFormField<S> => {
    const { rules, ...rest } = config;

    return {
      ...rest,
      kind: 'field',
      component,
      name,
      rules: rules?.map((rule) =>
        adaptRule(rule, (_value: unknown, values: S) => [name(values), values] as const),
      ),
    };
  },
  section: (config: Omit<NuiSmartFormSection<S>, 'kind'>): NuiSmartFormSection<S> => ({
    ...config,
    kind: 'section',
  }),
  array: <Row>(
    name: FieldSelector<S, readonly Row[] | undefined>,
    config: SmartArrayConfig<S, Row>,
  ): NuiSmartFormArray<S> => {
    const { fields, ...rest } = config;

    return {
      ...rest,
      kind: 'array',
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
