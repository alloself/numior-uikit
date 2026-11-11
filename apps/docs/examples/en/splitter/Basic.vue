<template>
  <div class="flex flex-col gap-3 w-full">
    <NuiSplitter
      v-model:ratio="ratio"
      :min="0.2"
      :max="0.8"
      class="w-full border rounded-md bg-surface"
    >
      <template #start>
        <div class="p-4 text-center text-muted-foreground">Preview</div>
      </template>
      <template #end>
        <div class="p-4 text-center text-muted-foreground">Code</div>
      </template>
    </NuiSplitter>
    <p class="m-0 text-sm text-muted-foreground">
      First pane share: {{ Math.round(ratio * 100) }}%
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiSplitter } from '@numior/vue';

const ratio = ref(0.5);
</script>
