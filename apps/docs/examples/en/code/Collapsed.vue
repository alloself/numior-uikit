<template>
  <NuiCode :code="log" :max-lines="4" wrap :copyable="false" />
</template>

<script setup lang="ts">
import { NuiCode } from '@numior/vue';

const log = [
  '[10:02:11] build started',
  '[10:02:12] vite v8 bundles 214 modules, including a very long line with the path to the package @numior/vue/src/table/NuiTable.vue',
  '[10:02:14] styles: 12 files',
  '[10:02:15] types: no errors',
  '[10:02:16] artifacts written to dist',
  '[10:02:16] build finished in 5.2 s',
].join('\n');
</script>
