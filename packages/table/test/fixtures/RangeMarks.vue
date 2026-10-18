<template>
  <div
    v-for="{ index, rect } in marks()"
    :key="index"
    :style="{
      insetBlockStart: `${rect.top}px`,
      insetInlineStart: `${rect.start}px`,
      inlineSize: `${rect.width}px`,
      blockSize: `${rect.height}px`,
    }"
  />
</template>

<script setup lang="ts">
import type { NuiTableOverlaySlot, NuiTableRange, NuiTableRect } from '../../src';

const { rectOf } = defineProps<NuiTableOverlaySlot>();

const MARKED: readonly NuiTableRange[] = [
  { from: { row: 1, col: 1 }, to: { row: 2, col: 2 } },
  { from: { row: 5, col: 0 }, to: { row: 5, col: 4 } },
];

const marks = (): Array<{ index: number; rect: NuiTableRect }> =>
  MARKED.flatMap((range, index) => {
    const rect = rectOf(range);

    return rect === undefined ? [] : [{ index, rect }];
  });
</script>
