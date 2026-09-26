import type { Component, InputHTMLAttributes } from 'vue';
import type { FormPath, FormPathValue } from '../../core/types';
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

type ArrayPath<S> = {
  [P in FormPath<S>]: FormPathValue<S, P> extends readonly unknown[] ? P : never;
}[FormPath<S>];

type RowOf<S, P extends string> = FormPathValue<S, P> extends readonly (infer R)[] ? R : never;

export interface SmartFieldConfig<S, P extends string, C> extends Omit<
  NuiSmartFormField<S>,
  'kind' | 'component' | 'name' | 'props'
> {
  readonly name: P;
  readonly props?: ControlProps<C> | NuiSmartFormPropsFactory<S, ControlProps<C>> | undefined;
}

export interface SmartArrayConfig<S, P extends string> extends Omit<
  NuiSmartFormArray<S>,
  'kind' | 'name' | 'newRow' | 'fields'
> {
  readonly name: P;
  readonly newRow: () => RowOf<S, P>;
  readonly fields: readonly NuiSmartFormEntry<RowOf<S, P>>[];
}

export const formConfig = <S extends object>() => ({
  field: <C extends Component, P extends FormPath<S>>(
    component: C,
    config: SmartFieldConfig<S, P, C>,
  ): NuiSmartFormField<S> => ({ ...config, kind: 'field', component }),
  section: (config: Omit<NuiSmartFormSection<S>, 'kind'>): NuiSmartFormSection<S> => ({
    ...config,
    kind: 'section',
  }),
  array: <P extends ArrayPath<S>>(config: SmartArrayConfig<S, P>): NuiSmartFormArray<S> => ({
    ...config,
    kind: 'array',
  }),
});
