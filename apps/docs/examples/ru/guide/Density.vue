<template>
  <div class="w-full grid-auto gap-6">
    <div data-nui-density="comfortable" class="flex flex-col gap-3">
      <p class="m-0 text-sm text-muted-foreground">comfortable</p>
      <NuiInput v-model="query" label="Поиск" placeholder="Название товара" />
      <div class="flex gap-2">
        <NuiButton>Найти</NuiButton>
        <NuiButton variant="outline" tone="neutral">Сбросить</NuiButton>
      </div>
    </div>
    <div data-nui-density="compact" class="flex flex-col gap-3">
      <p class="m-0 text-sm text-muted-foreground">compact</p>
      <NuiInput v-model="query" label="Поиск" placeholder="Название товара" />
      <div class="flex gap-2">
        <NuiButton>Найти</NuiButton>
        <NuiButton variant="outline" tone="neutral">Сбросить</NuiButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiInput } from '@numior/kit';

const query = ref('');
</script>
