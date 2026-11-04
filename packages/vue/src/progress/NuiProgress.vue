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
import { NuiSize, NuiTone } from '../shared/scale.types';

const {
  value,
  max = 100,
  size = NuiSize.Md,
  tone = NuiTone.Primary,
  label,
  valueText,
  id,
} = defineProps<NuiProgressProps>();
</script>
