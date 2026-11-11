<template>
  <div :ref="setContainer" class="viewport" :dir="dir" :style="framed.canvasStyle.value">
    <div class="body" :style="{ height: `${canvasSize}px`, ...framed.windowStyle.value }">
      <div
        v-for="item in items"
        :key="item.index"
        class="row"
        :data-index="item.index"
        :style="{ transform: transformOf(item) }"
      >
        Row {{ item.index }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUpdate, shallowRef } from 'vue';
import {
  useVirtualFrame,
  useVirtualList,
  type ItemSize,
  type VirtualAxis,
  type VirtualItem,
  type VirtualList,
} from '../../src';

const {
  count,
  itemSize,
  axis = 'y',
  overscan,
  initialCount,
  enabled = undefined,
  pinned,
  frozen,
  maxSize,
  inset,
  dir,
  listen = undefined,
} = defineProps<{
  count: number;
  itemSize: ItemSize;
  axis?: VirtualAxis | undefined;
  overscan?: number | undefined;
  initialCount?: number | undefined;
  enabled?: boolean | undefined;
  pinned?: number | undefined;
  frozen?: number | undefined;
  maxSize?: number | undefined;
  inset?: number | undefined;
  dir?: 'ltr' | 'rtl' | undefined;
  listen?: boolean | undefined;
}>();

const emit = defineEmits<{
  ready: [virtual: VirtualList];
  attach: [element: HTMLElement];
  render: [element: HTMLElement];
}>();

const container = shallowRef<HTMLElement | null>(null);

const virtual = useVirtualList(container, {
  count: () => count,
  itemSize: () => itemSize,
  axis: () => axis,
  overscan: () => overscan,
  initialCount: () => initialCount,
  enabled: () => enabled,
  pinned: () => pinned,
  frozen: () => frozen,
  maxSize: () => maxSize,
  inset: () => inset,
  listen: () => listen,
});

const framed = useVirtualFrame(container, virtual.frame);
const { items, canvasSize } = virtual;

const transformOf = (item: VirtualItem): string =>
  axis === 'x' ? `translateX(${item.offset}px)` : `translateY(${item.offset}px)`;

const setContainer = (element: unknown): void => {
  if (element instanceof HTMLElement) {
    emit('attach', element);
    container.value = element;
  } else {
    container.value = null;
  }
};

onBeforeUpdate(() => {
  if (container.value === null) {
    return;
  }

  emit('render', container.value);
});

emit('ready', virtual);

defineExpose({ virtual });
</script>
