<template>
  <NuiTooltip>
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="outline">Сохранить</NuiButton>
    </template>
    Сохраняет документ и историю изменений
  </NuiTooltip>
  <NuiTooltip placement="bottom" :open-delay="0">
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="ghost" tone="neutral">Опубликовать</NuiButton>
    </template>
    Без задержки показа
  </NuiTooltip>
</template>

<script setup lang="ts">
import { NuiButton, NuiTooltip } from '@numior/vue';
</script>
