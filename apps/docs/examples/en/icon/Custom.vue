<template>
  <div class="flex items-center gap-3">
    <NuiButton variant="ghost" tone="error" aria-label="Delete" icon="trash" />
    <NuiButton variant="outline" tone="neutral">
      <NuiIcon :icon="Heart" /> Add to favourites
    </NuiButton>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue';
import { NuiButton, NuiIcon } from '@numior/vue';

const Heart = () =>
  h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
    h('path', {
      d: 'M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .9-4.5 2.5C10.5 3.9 9.3 3 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z',
    }),
  ]);
</script>
