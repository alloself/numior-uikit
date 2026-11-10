<template>
  <div ref="container" class="list">
    <button
      v-for="(item, index) in count"
      :key="item"
      type="button"
      class="handle"
      @pointerdown="reorder.onPointerdown(index, $event)"
      @keydown="onKeydown(index, $event)"
      @blur="reorder.onBlur(index)"
    >
      Item {{ index }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue';
import { useReorder, type ReorderAxis, type ReorderEvent, type ReorderState } from '../../src';

const {
  axis,
  count,
  size,
  canMove,
  rtl = undefined,
} = defineProps<{
  axis: ReorderAxis;
  count: number;
  size: number;
  canMove?: ((from: number, to: number) => boolean) | undefined;
  rtl?: boolean | undefined;
}>();

const emit = defineEmits<{
  move: [from: number, to: number];
  change: [state: ReorderState];
  event: [event: ReorderEvent];
}>();

const container = shallowRef<HTMLElement | null>(null);

const scrolled = (client: number): number => client + (container.value?.scrollTop ?? 0);

const reorder = useReorder({
  axis,
  count: () => count,
  container,
  indexAt: (client) => Math.min(count - 1, Math.max(0, Math.floor(scrolled(client) / size))),
  canMove,
  onMove: (from, to) => emit('move', from, to),
  onChange: (state) => emit('change', state),
  onEvent: (event) => emit('event', event),
  rtl: () => rtl,
});

const onKeydown = (index: number, event: KeyboardEvent): void => {
  if (reorder.onKeydown(index, event)) {
    event.preventDefault();
  }
};

defineExpose({ reorder });
</script>
