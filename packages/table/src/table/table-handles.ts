import { inject, onMounted, provide, type InjectionKey, type ShallowRef } from 'vue';
import type { TableHandleGrab, TableHandles } from './table.types';

const HANDLES: InjectionKey<TableHandles> = Symbol('nui-table-handles');

const HANDLE = '.nui-table__resizer, .nui-table__grip, .nui-table__row-grip';

export const provideTableHandles = (): TableHandles => {
  const grabs = new WeakMap<Element, TableHandleGrab>();

  const handles: TableHandles = {
    attach: (element, grab) => {
      grabs.set(element, grab);
    },
    onPointerdown: (event) => {
      const handle = event.target instanceof Element ? event.target.closest(HANDLE) : null;

      if (handle === null) {
        return;
      }
      grabs.get(handle)?.(event);
    },
  };

  provide(HANDLES, handles);

  return handles;
};

export const useTableHandle = (
  element: Readonly<ShallowRef<Element | null>>,
  grab: TableHandleGrab,
): void => {
  const handles = inject(HANDLES, undefined);

  onMounted(() => {
    if (handles === undefined || element.value === null) {
      return;
    }
    handles.attach(element.value, grab);
  });
};
