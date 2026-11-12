<template>
  <NuiSwitch v-model="loading" class="mb-4">Загрузка</NuiSwitch>
  <NuiCard class="w-full max-w-sm" :loading="loading">
    <NuiCardMedia :src="cover" alt="" aspect="3 / 1" />
    <NuiCardHeader>
      <NuiCardTitle>Каталог 2026</NuiCardTitle>
      <NuiCardDescription>Обновлён вчера, 14 позиций</NuiCardDescription>
    </NuiCardHeader>
    <NuiCardContent :lines="2">Весенняя коллекция готова к публикации.</NuiCardContent>
  </NuiCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NuiCard,
  NuiCardContent,
  NuiCardDescription,
  NuiCardHeader,
  NuiCardMedia,
  NuiCardTitle,
  NuiSwitch,
} from '@numior/vue';

const cover =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 100'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1'%3E%3Cstop offset='0' stop-color='%234f46e5'/%3E%3Cstop offset='1' stop-color='%2306b6d4'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='300' height='100' fill='url(%23g)'/%3E%3C/svg%3E";

const loading = ref(true);
</script>
