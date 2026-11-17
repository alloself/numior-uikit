<template>
  <div ref="scroller" class="w-full max-w-md h-80 overflow-auto border rounded-md" tabindex="0">
    <div :style="{ blockSize: `${frame.lead}px` }"></div>
    <div class="sticky" :style="windowStyle">
      <div
        v-for="item in items"
        :key="item.slot"
        class="flex items-center px-4 text-sm"
        :style="{ blockSize: `${item.size}px` }"
      >
        Строка {{ item.index + 1 }} из 10 000
      </div>
    </div>
    <div :style="{ blockSize: `${frame.rest}px` }"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { useVirtualList } from '@numior/kit';

const scroller = useTemplateRef<HTMLElement>('scroller');

const { items, frame } = useVirtualList(scroller, { count: 10_000, itemSize: 36 });

const windowStyle = computed(() => ({
  insetBlockStart: `${frame.value.clampStart}px`,
  insetBlockEnd: `${frame.value.clampEnd}px`,
}));
</script>
