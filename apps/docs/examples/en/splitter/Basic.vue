<template>
  <NuiSplitter
    v-model:ratio="ratio"
    :min="0.2"
    :max="0.8"
    class="nui-min-h-40 nui-border nui-rounded"
  >
    <template #start>
      <div class="nui-p-4 nui-text-center nui-text-muted">Preview</div>
    </template>
    <template #end>
      <div class="nui-p-4 nui-text-center nui-text-muted">Code</div>
    </template>
  </NuiSplitter>
  <p class="nui-m-0 nui-text-sm nui-text-muted">First pane share: {{ Math.round(ratio * 100) }}%</p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiSplitter } from '@numior/vue';

const ratio = ref(0.5);
</script>
