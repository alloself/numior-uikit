<template>
  <div class="flex flex-col gap-3 w-full max-w-sm">
    <div class="flex justify-between text-sm">
      <span>Импорт каталога</span>
      <span class="text-muted-foreground">{{ done }}%</span>
    </div>
    <NuiProgress :value="done" label="Импорт каталога" />
    <NuiButton size="sm" variant="outline" :disabled="running" @click="start">Запустить</NuiButton>
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

    if (done.value !== 100) {
      return;
    }

    clearInterval(timer);
    running.value = false;
  }, 300);
};
</script>
