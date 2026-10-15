<template>
  <NuiMenuRadioGroup :model-value="entry.value" @update:model-value="change">
    <NuiMenuRadioItem
      v-for="option in entry.items"
      :key="option.value"
      :value="option.value"
      :icon="option.icon"
      :disabled="option.disabled"
    >
      {{ option.label }}
    </NuiMenuRadioItem>
  </NuiMenuRadioGroup>
</template>

<script setup lang="ts">
import NuiMenuRadioGroup from './NuiMenuRadioGroup.vue';
import NuiMenuRadioItem from './NuiMenuRadioItem.vue';
import type { NuiMenuRadioGroupEntry } from './menu.types';

const { entry } = defineProps<{ entry: NuiMenuRadioGroupEntry }>();

const change = (value: string | undefined): void => {
  if (value !== undefined) {
    entry.onChange(value);
  }
};
</script>
