<template>
  <NuiMenu :items="actions">
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="outline" tone="neutral">Действия с заказом</NuiButton>
    </template>
  </NuiMenu>
</template>

<script setup lang="ts">
import { NuiButton, NuiMenu, type NuiMenuEntry } from '@numior/vue';

const actions: NuiMenuEntry[] = [
  { label: 'Открыть заказ', icon: 'eye' },
  { label: 'Дублировать', icon: 'copy' },
  { label: 'Назначить менеджера', icon: 'user' },
  { type: 'separator' },
  { label: 'Отменить заказ', icon: 'trash', tone: 'error' },
];
</script>
