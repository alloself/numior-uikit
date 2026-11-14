<template>
  <div class="w-full grid-auto gap-6">
    <div class="flex flex-col gap-3">
      <p class="m-0 text-sm text-muted-foreground">Без класса</p>
      <NuiInput v-model="query" label="Поиск" placeholder="Название товара" />
      <div class="flex gap-2">
        <NuiButton>Найти</NuiButton>
        <NuiButton variant="outline" tone="neutral">Сбросить</NuiButton>
      </div>
    </div>
    <div class="nui-theme--density-compact flex flex-col gap-3">
      <p class="m-0 text-sm text-muted-foreground">nui-theme--density-compact</p>
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
import { NuiButton, NuiInput } from '@numior/vue';

const query = ref('');
</script>
