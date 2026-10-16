import type { ElementNode, NodeId } from '@numior/editor-core';
import { inject, provide, shallowRef, type InjectionKey, type ShallowRef } from 'vue';
import type { NuiEditorBlock } from './block.types';

export interface NuiEditorBlockState<T> {
  use(node: ElementNode): ShallowRef<T>;
}

const BLOCK_STATES: InjectionKey<object> = Symbol('nui-editor-block-states');

const DETACHED = {};

export const defineBlock = (block: NuiEditorBlock): NuiEditorBlock => block;

export const provideBlockStates = (): void => {
  provide(BLOCK_STATES, {});
};

export const defineBlockState = <T>(initial: (node: ElementNode) => T): NuiEditorBlockState<T> => {
  const editors = new WeakMap<object, Map<NodeId, ShallowRef<T>>>();

  return {
    use: (node) => {
      const owner = inject(BLOCK_STATES, DETACHED);
      const store = editors.get(owner) ?? new Map<NodeId, ShallowRef<T>>();
      const value = store.get(node.id) ?? shallowRef(initial(node));

      editors.set(owner, store);
      store.set(node.id, value);
      return value;
    },
  };
};
