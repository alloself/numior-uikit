import type { Component, InputHTMLAttributes } from 'vue';
import type { KeepValue } from '../../paths/paths.types';
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

type ModelKeys<M extends string> = M | `onUpdate:${M}`;

type ControlKeys =
  | ModelKeys<'modelValue'>
  | 'id'
  | 'name'
  | 'invalid'
  | 'required'
  | 'disabled'
  | 'readonly';

export type ControlProps<C, M extends string = 'modelValue'> = Omit<
  ComponentProps<C>,
  ControlKeys | ModelKeys<M>
> &
  Omit<InputHTMLAttributes, ControlKeys | ModelKeys<M> | 'value'>;

export type ControlValue<C, M extends string = 'modelValue'> =
  ComponentProps<C> extends { readonly [K in M]: infer V }
    ? V
    : ComponentProps<C> extends { readonly [K in M]?: infer V }
      ? V | undefined
      : unknown;

type ControlEmit<C, M extends string> =
  ComponentProps<C> extends {
    readonly [K in `onUpdate:${M}`]?: (value: infer E) => unknown;
  }
    ? E
    : unknown;

type Unchecked<E> = unknown extends E
  ? true
  : E extends readonly (infer I)[]
    ? unknown extends I
      ? true
      : false
    : false;

type EmitsInto<C, R, M extends string> =
  Unchecked<ControlEmit<C, M>> extends true
    ? unknown
    : [ControlEmit<C, M>] extends [R]
      ? unknown
      : { readonly updateModel: ControlEmit<C, M> };

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

export const formConfig = <S>() => ({
  field: <C extends Component, R extends ControlValue<C, M>, M extends string = 'modelValue'>(
    component: C & EmitsInto<C, R, M>,
    name: FieldSelector<S, R>,
    config: SmartFieldConfig<S, R, C, M> = {},
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
