<template>
  <span
    v-for="frame in shownClips"
    :key="frame.key"
    class="nui-spreadsheet__clip"
    :style="rectStyle(frame.rect)"
  >
    <span
      v-for="edge in CLIP_EDGES"
      :key="edge"
      class="nui-spreadsheet__clip-edge"
      :class="`nui-spreadsheet__clip-edge--${edge}`"
    ></span>
  </span>
  <span
    v-for="frame in shownLit"
    :key="frame.key"
    class="nui-spreadsheet__lit"
    :style="rectStyle(frame.rect)"
  ></span>
  <span
    v-if="clearingRect"
    class="nui-spreadsheet__fill-clear"
    :style="rectStyle(clearingRect)"
  ></span>
  <span
    v-if="previewRect"
    class="nui-spreadsheet__fill-preview"
    :style="rectStyle(previewRect)"
  ></span>
  <span
    v-if="handleRect"
    class="nui-spreadsheet__fill"
    :class="{
      'nui-spreadsheet__fill--frozen-row': handleEdge.row,
      'nui-spreadsheet__fill--frozen-col': handleEdge.col,
    }"
    :style="rectStyle(handleRect)"
  >
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
import type { SheetClipFrame, SheetMarksProps, ShownClip } from './sheet.types';

const CLIP_EDGES = ['top', 'right', 'bottom', 'left'] as const;

const {
  rectOf,
  handle,
  preview,
  clearing,
  clips,
  lit,
  frozenRows = 0,
  frozenCols = 0,
} = defineProps<SheetMarksProps>();

const emit = defineEmits<{
  grip: [event: PointerEvent];
  fill: [];
}>();

const handleRect = computed(() => (handle === undefined ? undefined : rectOf(handle)));

const handleEdge = computed(() => ({
  row:
    handle !== undefined &&
    frozenRows > 0 &&
    Math.max(handle.from.row, handle.to.row) === frozenRows - 1,
  col:
    handle !== undefined &&
    frozenCols > 0 &&
    Math.max(handle.from.col, handle.to.col) === frozenCols - 1,
}));

const previewRect = computed(() => (preview === undefined ? undefined : rectOf(preview)));

const clearingRect = computed(() => (clearing === undefined ? undefined : rectOf(clearing)));

const shownOf = (frames: readonly SheetClipFrame[]): ShownClip[] =>
  frames.reduce<ShownClip[]>((shown, frame) => {
    const rect = rectOf(frame.range);

    if (rect !== undefined) {
      shown.push({ key: frame.key, rect });
    }
    return shown;
  }, []);

const shownClips = computed(() => shownOf(clips));

const shownLit = computed(() => shownOf(lit));
</script>
