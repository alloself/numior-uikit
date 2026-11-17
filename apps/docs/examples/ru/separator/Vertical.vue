<template>
  <div class="flex items-center gap-1">
    <NuiButton variant="ghost" tone="neutral" size="sm">Экспорт</NuiButton>
    <NuiSeparator orientation="vertical" />
    <NuiButton variant="ghost" tone="neutral" size="sm">Фильтр</NuiButton>
    <NuiButton variant="ghost" tone="neutral" size="sm">Сортировка</NuiButton>
  </div>
</template>

<script setup lang="ts">
import { NuiButton, NuiSeparator } from '@numior/kit';
</script>
