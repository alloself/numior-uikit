<template>
  <div
    class="nui-separator"
    :class="[`nui-separator--orientation-${orientation}`, { 'nui-separator--labelled': labelled }]"
    :role="decorative ? 'none' : 'separator'"
    :aria-orientation="decorative || orientation === 'horizontal' ? undefined : orientation"
  >
    <span v-if="labelled" class="nui-separator__label"
      ><slot>{{ label }}</slot></span
    >
  </div>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue';
import type { NuiSeparatorProps } from './separator.types';

const { orientation = 'horizontal', decorative = false, label } = defineProps<NuiSeparatorProps>();

defineSlots<{ default?(): unknown }>();

const slots = useSlots();
const labelled = computed(() => slots.default !== undefined || label !== undefined);
</script>
