<template>
  <div ref="scroller" class="w-full max-w-md h-80 overflow-auto border rounded-md" tabindex="0">
    <div :style="{ paddingBlockStart: `${startSize}px`, paddingBlockEnd: `${endSize}px` }">
      <div
        v-for="item in items"
        :key="item.index"
        class="flex items-center px-4 text-sm"
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
