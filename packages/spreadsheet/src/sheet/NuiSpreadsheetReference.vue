<template>
  <span class="nui-spreadsheet__ref" :class="`nui-spreadsheet__ref--tone-${tone}`" :style="style">
    <span
      v-for="grip in grips"
      :key="grip"
      class="nui-spreadsheet__grip"
      :class="`nui-spreadsheet__grip--${grip}`"
      @pointerdown="emit('grip', $event, grip)"
    ></span>
  </span>
</template>

<script setup lang="ts">
import type { NuiTableRect } from '@numior/table';
import { computed } from 'vue';
import { FrameGrip, type SheetReferenceProps } from './sheet.types';

const { tone, rect } = defineProps<SheetReferenceProps>();

const emit = defineEmits<{
  grip: [event: PointerEvent, grip: FrameGrip];
}>();

const grips = Object.values(FrameGrip);

const styleOf = (shown: NuiTableRect | undefined): Record<string, string> =>
  shown === undefined
    ? { display: 'none' }
    : {
        insetBlockStart: `${String(shown.top)}px`,
        insetInlineStart: `${String(shown.start)}px`,
        inlineSize: `${String(shown.width)}px`,
        blockSize: `${String(shown.height)}px`,
      };

const style = computed(() => styleOf(rect));
</script>
