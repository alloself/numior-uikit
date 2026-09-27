<template>
  <div class="nui-flex nui-flex-col nui-gap-3 nui-w-full nui-max-w-sm">
    <div class="nui-flex nui-justify-between nui-text-sm">
      <span>Catalogue import</span>
      <span class="nui-text-muted">{{ done }}%</span>
    </div>
    <NuiProgress :value="done" label="Catalogue import" />
    <NuiButton size="sm" variant="outline" :disabled="running" @click="start">Start</NuiButton>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiProgress } from '@numior/vue';

const done = ref(0);
const running = ref(false);

const start = (): void => {
  done.value = 0;
  running.value = true;

  const timer = setInterval(() => {
    done.value = Math.min(100, done.value + 10);

    if (done.value === 100) {
      clearInterval(timer);
      running.value = false;
    }
  }, 300);
};
</script>
