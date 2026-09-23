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
    <span class="nui-listbox__check">
      <NuiIcon v-if="selected" alias="check" />
    </span>
    <NuiIcon v-if="option.icon" :alias="option.icon" class="nui-listbox__icon" />
    <span class="nui-listbox__body">
      <span class="nui-listbox__label"
        ><slot>{{ option.label }}</slot></span
      >
      <span v-if="option.description" class="nui-listbox__description">
        {{ option.description }}
      </span>
    </span>
  </div>
</template>

<script setup lang="ts" generic="T">
import NuiIcon from '../icon/NuiIcon.vue';
import type { NuiListboxOptionProps } from './listbox.types';

const { option, id, selected, active } = defineProps<NuiListboxOptionProps<T>>();
const emit = defineEmits<{ select: [] }>();

const choose = (): void => {
  if (!option.disabled) {
    emit('select');
  }
};
</script>
