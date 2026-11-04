import { inject, onBeforeUnmount, onMounted, provide, type InjectionKey } from 'vue';
import { createCollection } from '@numior/primitives';
import type { ToolbarFace } from './toolbar-items';
import type { ToolbarHints } from './toolbar.types';

const toolbarHintsKey: InjectionKey<ToolbarHints> = Symbol('nui-editor-toolbar-hints');

export const provideToolbarHints = (): ToolbarHints => {
  const faces = new WeakMap<Element, () => ToolbarFace>();

  const hints: ToolbarHints = {
    controls: createCollection<symbol>(),
    register: (element, face) => {
      faces.set(element, face);
    },
    release: (element) => {
      faces.delete(element);
    },
    faceOf: (element) => (element === null ? undefined : faces.get(element)?.()),
  };

  provide(toolbarHintsKey, hints);
  return hints;
};

export const useToolbarHints = (): ToolbarHints | undefined => inject(toolbarHintsKey, undefined);

export const useToolbarControl = (element: () => Element | null | undefined): void => {
  const hints = useToolbarHints();
  const key = Symbol('toolbar-control');

  onMounted(() => {
    hints?.controls.set(key, element());
  });

  onBeforeUnmount(() => {
    hints?.controls.set(key, null);
  });
};
