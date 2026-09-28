import { inject, provide, type Component, type InjectionKey } from 'vue';
import { isRecord, shapeOf, type Guard, type Shape, type ShapeOf } from '../guards/guards';
import type {
  ControlOptions,
  ControlValue,
  EmitsInto,
  NuiControlEntry,
  NuiControlRegistry,
} from './control.types';

export const CONTROLS_KEY: InjectionKey<NuiControlRegistry> = Symbol('nui:controls');

export const controlProps = <S extends Shape>(shape: S): Guard<ShapeOf<S>> => {
  const matches = shapeOf(shape);

  return (value): value is ShapeOf<S> =>
    isRecord(value) && Object.keys(value).every((key) => key in shape) && matches(value);
};

export const control = <
  C extends Component,
  V extends ControlValue<C, M>,
  M extends string = 'modelValue',
>(
  component: C & EmitsInto<C, V, M>,
  accepts: Guard<V>,
  options: ControlOptions<M> = {},
): NuiControlEntry<C, V, M | 'modelValue'> => ({
  component,
  model: options.model ?? 'modelValue',
  accepts,
  props: options.props ?? isRecord,
});

export const defineControls = <R extends NuiControlRegistry>(registry: R): R => registry;

export const provideControls = (registry: NuiControlRegistry): void => {
  provide(CONTROLS_KEY, registry);
};

export const useControls = (): NuiControlRegistry | null => inject(CONTROLS_KEY, null);
