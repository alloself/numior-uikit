<template>
  <div :dir="dir">
    <div
      ref="container"
      role="listbox"
      @keydown="navigation.onKeydown"
      @focusin="navigation.onFocusin"
    >
      <button
        v-for="(label, index) in labels"
        :id="`item-${index}`"
        :key="label"
        :ref="collection.ref(label)"
        type="button"
        :role="role"
        tabindex="-1"
        :aria-disabled="disabled.includes(index) ? 'true' : undefined"
      >
        {{ label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue';
import {
  createCollection,
  useListNavigation,
  type ListFocusMode,
  type ListNavigation,
  type ListOrientation,
} from '../../src';

const {
  labels,
  disabled = [],
  role = 'option',
  mode,
  orientation,
  dir,
  loop = undefined,
  pageSize,
} = defineProps<{
  labels: readonly string[];
  disabled?: readonly number[] | undefined;
  role?: 'menuitem' | 'tab' | 'option' | undefined;
  mode?: ListFocusMode | undefined;
  orientation?: ListOrientation | undefined;
  dir?: 'ltr' | 'rtl' | undefined;
  loop?: boolean | undefined;
  pageSize?: number | undefined;
}>();

const emit = defineEmits<{
  ready: [navigation: ListNavigation];
}>();

const container = shallowRef<HTMLElement | null>(null);
const collection = createCollection<string>();

const navigation = useListNavigation(container, {
  items: collection.elements,
  mode: () => mode,
  orientation: () => orientation,
  loop: () => loop,
  pageSize: () => pageSize,
});

emit('ready', navigation);

defineExpose({ navigation });
</script>
