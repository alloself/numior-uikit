<template>
  <span class="nui-row" :class="{ 'nui-row--nowrap': nowrap, 'nui-row--inline': inline }">
    <span v-if="icon || $slots.leading" class="nui-row__leading">
      <slot name="leading"><NuiIcon v-if="icon" :icon="icon" /></slot>
    </span>
    <span class="nui-row__body">
      <span ref="titleElement" class="nui-row__title"
        ><slot>{{ title }}</slot></span
      >
      <span v-if="description || $slots.description" class="nui-row__description">
        <slot name="description">{{ description }}</slot>
      </span>
    </span>
    <span v-if="$slots.trailing" class="nui-row__trailing"><slot name="trailing" /></span>
    <span v-if="check !== undefined" class="nui-row__check">
      <NuiIcon v-if="check" icon="check" />
    </span>
  </span>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue';
import NuiIcon from '../icon/NuiIcon.vue';
import type { NuiRowProps } from './row.types';

const {
  title,
  description,
  icon,
  check = undefined,
  nowrap = false,
  inline = false,
} = defineProps<NuiRowProps>();

const titleElement = useTemplateRef<HTMLElement>('titleElement');

defineExpose({ titleElement });
</script>
