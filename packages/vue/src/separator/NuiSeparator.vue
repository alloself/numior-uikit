<template>
  <div
    class="nui-separator"
    :class="[`nui-separator--orientation-${orientation}`, { 'nui-separator--labelled': labelled }]"
    :role="decorative ? 'none' : 'separator'"
    :aria-orientation="
      decorative || orientation === NuiSeparatorOrientation.Horizontal ? undefined : orientation
    "
    :aria-labelledby="named ? labelId : undefined"
  >
    <span v-if="labelled" :id="labelId" class="nui-separator__label"
      ><slot>{{ label }}</slot></span
    >
  </div>
</template>

<script setup lang="ts">
import { computed, useId, useSlots } from 'vue';
import { NuiSeparatorOrientation, type NuiSeparatorProps } from './separator.types';

const {
  orientation = NuiSeparatorOrientation.Horizontal,
  decorative = false,
  label,
} = defineProps<NuiSeparatorProps>();

defineSlots<{ default?(): unknown }>();

const slots = useSlots();
const labelId = useId();

const labelled = computed(() => slots.default !== undefined || label !== undefined);
const named = computed(() => labelled.value && !decorative);
</script>
