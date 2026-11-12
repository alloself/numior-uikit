<template>
  <div class="flex w-full max-w-sm flex-col gap-3">
    <span class="text-sm">{{ status }}</span>
    <NuiProgress :value="loaded" :max="TOTAL" label="Catalog import" :value-text="status" />
    <NuiButton class="self-start" size="sm" variant="outline" :loading="running" @click="start">
      Import catalog
    </NuiButton>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { promiseTimeout } from '@vueuse/core';
import { NuiButton, NuiProgress } from '@numior/vue';

const TOTAL = 1200;
const BATCHES = [120, 340, 560, 780, 1010, 1200];

const count = new Intl.NumberFormat('en-US');

const loaded = ref(0);
const running = ref(false);

const status = computed(
  () => `${count.format(loaded.value)} of ${count.format(TOTAL)} products imported`,
);

const start = async (): Promise<void> => {
  loaded.value = 0;
  running.value = true;

  for (const batch of BATCHES) {
    await promiseTimeout(400);
    loaded.value = batch;
  }
  running.value = false;
};
</script>
