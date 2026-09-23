<template>
  <progress
    :id="id"
    class="nui-progress"
    :class="[
      `nui-progress--size-${size}`,
      `nui-progress--tone-${tone}`,
      { 'nui-progress--indeterminate': value === undefined },
    ]"
    v-bind="value === undefined ? {} : { value }"
    :max="max"
    :aria-label="label"
    :aria-valuetext="valueText"
  ></progress>
</template>

<script setup lang="ts">
import type { NuiProgressProps } from './progress.types';

const {
  value,
  max = 100,
  size = 'md',
  tone = 'primary',
  label,
  valueText,
  id,
} = defineProps<NuiProgressProps>();
</script>
