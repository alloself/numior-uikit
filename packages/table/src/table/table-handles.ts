import {
  createPressTargets,
  usePressTarget,
  type PointerHandler,
  type PressTargets,
} from '@numior/primitives';
import { inject, provide, type InjectionKey, type ShallowRef } from 'vue';

const HANDLES: InjectionKey<PressTargets> = Symbol('nui-table-handles');

export const provideTableHandles = (): PressTargets => {
  const handles = createPressTargets();

  provide(HANDLES, handles);
  return handles;
};

export const useTableHandle = (
  element: Readonly<ShallowRef<Element | null>>,
  grab: PointerHandler,
): void => {
  usePressTarget(inject(HANDLES, undefined), element, grab);
};
