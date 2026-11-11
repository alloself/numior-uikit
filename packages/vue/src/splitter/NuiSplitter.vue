<template>
  <div
    ref="root"
    class="nui-splitter"
    :class="[
      `nui-splitter--orientation-${orientation}`,
      { 'nui-splitter--dragging': dragging, 'nui-splitter--disabled': disabled },
    ]"
    :style="{ '--_ratio': shown }"
  >
    <div :id="startId" class="nui-splitter__pane nui-splitter__pane--start">
      <slot name="start" />
    </div>
    <div
      class="nui-splitter__divider"
      role="separator"
      :aria-orientation="
        orientation === NuiSplitterOrientation.Horizontal ? 'vertical' : 'horizontal'
      "
      :aria-label="labelText"
      :aria-controls="startId"
      :aria-valuenow="Math.round(shown * 100)"
      :aria-valuemin="Math.round(min * 100)"
      :aria-valuemax="Math.round(max * 100)"
      :aria-disabled="disabled ? 'true' : undefined"
      :tabindex="disabled ? -1 : 0"
      @pointerdown="onPointerdown"
      @pointermove="onPointermove"
      @pointerup="onPointerup"
      @pointercancel="onPointerup"
      @keydown="onKeydown"
    >
      <span class="nui-splitter__grip"></span>
    </div>
    <div class="nui-splitter__pane nui-splitter__pane--end">
      <slot name="end" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { useControlId, useDirection, useMessages } from '@numior/primitives';
import { clampRatio, ratioFromPointer, ratioMoveFor } from './splitter-ratio';
import { splitterMessages } from './splitter.messages';
import { NuiSplitterOrientation, SplitterStep, type NuiSplitterProps } from './splitter.types';

const {
  id,
  orientation = NuiSplitterOrientation.Horizontal,
  min = 0.1,
  max = 0.9,
  step = 0.05,
  disabled = false,
  label,
} = defineProps<NuiSplitterProps>();

const ratio = defineModel<number>('ratio', { default: 0.5 });

defineSlots<{ start?(): unknown; end?(): unknown }>();

const root = useTemplateRef<HTMLElement>('root');
const baseId = useControlId(() => id);
const startId = computed(() => `${baseId.value}-start`);
const messages = useMessages(splitterMessages);
const direction = useDirection(root);
const dragging = ref(false);

const labelText = computed(() => label ?? messages.value.resize);
const bounds = computed(() => ({ min, max }));
const shown = computed(() => clampRatio(ratio.value, bounds.value));
const vertical = (): boolean => orientation === NuiSplitterOrientation.Vertical;

const apply = (next: number): void => {
  ratio.value = clampRatio(next, bounds.value);
};

const onPointerdown = (event: PointerEvent): void => {
  if (disabled || event.button !== 0 || !(event.currentTarget instanceof HTMLElement)) {
    return;
  }
  event.preventDefault();
  event.currentTarget.setPointerCapture(event.pointerId);
  dragging.value = true;
};

const onPointermove = (event: PointerEvent): void => {
  const rect = root.value?.getBoundingClientRect();

  if (!dragging.value || rect === undefined) {
    return;
  }
  apply(ratioFromPointer(rect, event, vertical(), direction.isRtl()));
};

const onPointerup = (event: PointerEvent): void => {
  if (!dragging.value) {
    return;
  }
  dragging.value = false;

  if (!(event.currentTarget instanceof HTMLElement)) {
    return;
  }

  event.currentTarget.releasePointerCapture(event.pointerId);
};

const onKeydown = (event: KeyboardEvent): void => {
  const move = ratioMoveFor(event.key, vertical(), direction.isRtl());

  if (disabled || move === undefined) {
    return;
  }
  event.preventDefault();

  switch (move) {
    case SplitterStep.Min:
      apply(min);
      break;
    case SplitterStep.Max:
      apply(max);
      break;
    case SplitterStep.Grow:
      apply(shown.value + step);
      break;
    case SplitterStep.Shrink:
      apply(shown.value - step);
      break;
  }
};
</script>
