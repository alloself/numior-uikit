<template>
  <div class="nui-flex nui-flex-col nui-gap-3 nui-w-full">
    <NuiSplitter
      v-model:ratio="ratio"
      :min="0.2"
      :max="0.8"
      class="nui-w-full nui-min-h-40 nui-border nui-rounded nui-bg-surface"
    >
      <template #start>
        <div class="nui-p-4 nui-text-center nui-text-muted">Превью</div>
      </template>
      <template #end>
        <div class="nui-p-4 nui-text-center nui-text-muted">Код</div>
      </template>
    </NuiSplitter>
    <p class="nui-m-0 nui-text-sm nui-text-muted">
      Доля первой панели: {{ Math.round(ratio * 100) }}%
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiSplitter } from '@numior/vue';

const ratio = ref(0.5);
</script>
