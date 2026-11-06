<template>
  <span class="nui-spreadsheet__ref" :class="`nui-spreadsheet__ref--tone-${tone}`" :style="style">
    <template v-if="!passive">
      <span
        v-for="grip in grips"
        :key="grip"
        class="nui-spreadsheet__grip"
        :class="`nui-spreadsheet__grip--${grip}`"
        @pointerdown="emit('grip', $event, grip)"
      ></span>
    </template>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { rectStyle } from './sheet-rect';
import { FrameGrip, type SheetReferenceProps } from './sheet.types';

const { tone, rect, passive } = defineProps<SheetReferenceProps>();

const emit = defineEmits<{
  grip: [event: PointerEvent, grip: FrameGrip];
}>();

const grips = Object.values(FrameGrip);

const style = computed(() => rectStyle(rect));
</script>
