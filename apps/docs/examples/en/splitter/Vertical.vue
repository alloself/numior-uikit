<template>
  <NuiSplitter
    v-model:ratio="ratio"
    orientation="vertical"
    :step="0.1"
    class="nui-h-80 nui-border nui-rounded"
  >
    <template #start>
      <div class="nui-p-4 nui-text-center nui-text-muted">Editor</div>
    </template>
    <template #end>
      <div class="nui-p-4 nui-text-center nui-text-muted">Terminal</div>
    </template>
  </NuiSplitter>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiSplitter } from '@numior/vue';

const ratio = ref(0.7);
</script>
