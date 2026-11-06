<template>
  <span
    v-for="frame in clips"
    :key="frame.key"
    class="nui-spreadsheet__clip"
    :style="rectStyle(rectOf(frame.range))"
  ></span>
  <span class="nui-spreadsheet__fill-preview" :style="previewStyle"></span>
  <span class="nui-spreadsheet__fill" :style="handleStyle">
    <span
      class="nui-spreadsheet__fill-grip"
      aria-hidden="true"
      @pointerdown="emit('grip', $event)"
      @dblclick="emit('fill')"
    ></span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { rectStyle } from './sheet-rect';
import type { SheetMarksProps } from './sheet.types';

const { rectOf, handle, preview, clips } = defineProps<SheetMarksProps>();

const emit = defineEmits<{
  grip: [event: PointerEvent];
  fill: [];
}>();

const handleStyle = computed(() => rectStyle(handle === undefined ? undefined : rectOf(handle)));

const previewStyle = computed(() => rectStyle(preview === undefined ? undefined : rectOf(preview)));
</script>
