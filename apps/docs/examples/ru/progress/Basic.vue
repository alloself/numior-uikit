<template>
  <NuiProgress
    :value="uploaded"
    :max="total"
    label="Загрузка файлов"
    :value-text="`${uploaded} из ${total}`"
  />
  <NuiProgress :value="72" tone="success" size="lg" label="Готовность релиза" />
  <NuiProgress label="Подготовка" size="sm" tone="info" />
</template>

<script setup lang="ts">
import { NuiProgress } from '@numior/vue';

const uploaded = 3;
const total = 8;
</script>
