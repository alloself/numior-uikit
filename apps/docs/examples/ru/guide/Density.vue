<template>
  <div class="nui-grid-auto nui-gap-6">
    <div data-nui-density="comfortable" class="nui-flex nui-flex-col nui-gap-3">
      <p class="nui-m-0 nui-text-sm nui-text-muted">comfortable</p>
      <NuiInput v-model="query" label="Поиск" placeholder="Название товара" />
      <div class="nui-flex nui-gap-2">
        <NuiButton>Найти</NuiButton>
        <NuiButton variant="outline" tone="neutral">Сбросить</NuiButton>
      </div>
    </div>
    <div data-nui-density="compact" class="nui-flex nui-flex-col nui-gap-3">
      <p class="nui-m-0 nui-text-sm nui-text-muted">compact</p>
      <NuiInput v-model="query" label="Поиск" placeholder="Название товара" />
      <div class="nui-flex nui-gap-2">
        <NuiButton>Найти</NuiButton>
        <NuiButton variant="outline" tone="neutral">Сбросить</NuiButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiInput } from '@numior/vue';

const query = ref('');
</script>
