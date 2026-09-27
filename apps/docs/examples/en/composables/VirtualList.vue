<template>
  <div
    ref="scroller"
    class="nui-w-full nui-max-w-md nui-h-80 nui-overflow-auto nui-border nui-rounded"
    tabindex="0"
  >
    <div :style="{ paddingBlockStart: `${startSize}px`, paddingBlockEnd: `${endSize}px` }">
      <div
        v-for="item in items"
        :key="item.index"
        class="nui-flex nui-items-center nui-px-4 nui-text-sm"
        :style="{ blockSize: `${item.size}px` }"
      >
        Row {{ item.index + 1 }} of 10,000
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { useVirtualList } from '@numior/primitives';

const scroller = useTemplateRef<HTMLElement>('scroller');

const { items, startSize, endSize } = useVirtualList(scroller, { count: 10_000, itemSize: 36 });
</script>
