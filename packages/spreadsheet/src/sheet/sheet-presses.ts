import {
  createPressTargets,
  pressRefOf,
  type PointerHandler,
  type PressRef,
  type PressTargets,
} from '@numior/primitives';
import { inject, provide, type InjectionKey } from 'vue';

const PRESSES: InjectionKey<PressTargets> = Symbol('nui-spreadsheet-presses');

export const provideSheetPresses = (): PressTargets => {
  const presses = createPressTargets();

  provide(PRESSES, presses);
  return presses;
};

export const useSheetPress = (): ((press: PointerHandler) => PressRef) => {
  const presses = inject(PRESSES, undefined);

  return (press) => pressRefOf(presses, press);
};
