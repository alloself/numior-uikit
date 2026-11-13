<template>
  <span
    v-if="rect !== undefined"
    class="nui-spreadsheet__ref"
    :class="[
      `nui-spreadsheet__ref--tone-${tone}`,
      { 'nui-spreadsheet__ref--first-row': firstRow, 'nui-spreadsheet__ref--first-col': firstCol },
    ]"
    :style="style"
  >
    <template v-if="!passive">
      <span
        v-for="grip in grips"
        :key="grip"
        class="nui-spreadsheet__grip"
        :class="`nui-spreadsheet__grip--${grip}`"
        :ref="press((event) => emit('grip', event, grip))"
      ></span>
    </template>
  </span>
</template>

<script setup lang="ts">
import { tableRectStyle } from '@numior/table';
import { computed } from 'vue';
import { useSheetPress } from './sheet-presses';
import { FrameGrip, type SheetReferenceProps } from './sheet.types';

const { tone, rect, passive, firstRow, firstCol } = defineProps<SheetReferenceProps>();

const emit = defineEmits<{
  grip: [event: PointerEvent, grip: FrameGrip];
}>();

const press = useSheetPress();

const grips = Object.values(FrameGrip);

const style = computed(() => tableRectStyle(rect));
</script>
