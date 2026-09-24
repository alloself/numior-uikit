<template>
  <div
    :id="id"
    role="option"
    tabindex="-1"
    class="nui-listbox__option"
    :class="{
      'nui-listbox__option--active': active,
      'nui-listbox__option--selected': selected,
      'nui-listbox__option--disabled': option.disabled,
    }"
    :aria-selected="selected ? 'true' : 'false'"
    :aria-disabled="option.disabled || undefined"
    @click="choose"
  >
    <NuiRow
      :icon="option.icon"
      :title="option.label"
      :description="option.description"
      :check="selected"
      nowrap
    >
      <slot />
    </NuiRow>
  </div>
</template>

<script setup lang="ts" generic="T">
import NuiRow from '../row/NuiRow.vue';
import type { NuiListboxOptionProps } from './listbox.types';

const { option, id, selected, active } = defineProps<NuiListboxOptionProps<T>>();
const emit = defineEmits<{ select: [] }>();

const choose = (): void => {
  if (!option.disabled) {
    emit('select');
  }
};
</script>
