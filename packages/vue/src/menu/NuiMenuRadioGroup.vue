<template>
  <div role="group" class="nui-menu-group">
    <slot />
  </div>
</template>

<script setup lang="ts" generic="T">
import { computed } from 'vue';
import { defaultOptionKey } from '../shared/options';
import { provideMenuRadio } from './menu-context';
import type { NuiMenuRadioGroupProps } from './menu.types';

const { getKey } = defineProps<NuiMenuRadioGroupProps<T>>();

const model = defineModel<T>();

const keyOf = (value: T): string => {
  if (getKey === undefined || value === undefined || value === null) {
    return defaultOptionKey(value);
  }

  return getKey(value);
};

const selectedKey = computed(() => (model.value === undefined ? undefined : keyOf(model.value)));

provideMenuRadio<T>({
  modelValue: model,
  selectedKey,
  keyOf,
  select: (value) => {
    model.value = value;
  },
});
</script>
