<template>
  <NuiSplitter
    v-model:ratio="ratio"
    orientation="vertical"
    :step="0.1"
    class="w-full h-80 border rounded-md bg-surface"
  >
    <template #start>
      <div class="p-4 text-center text-muted-foreground">Редактор</div>
    </template>
    <template #end>
      <div class="p-4 text-center text-muted-foreground">Терминал</div>
    </template>
  </NuiSplitter>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiSplitter } from '@numior/vue';

const ratio = ref(0.7);
</script>
