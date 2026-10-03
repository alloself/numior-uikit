<template>
  <NuiMenu :items="entries" placement="bottom-end" label="Действия с заказом">
    <template #trigger="{ attrs }">
      <NuiButton
        v-bind="attrs"
        variant="ghost"
        tone="neutral"
        aria-label="Действия"
        icon="ellipsis"
      />
    </template>
  </NuiMenu>
  <p class="text-sm text-muted-foreground">Действие: {{ last || 'не выбрано' }}</p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiMenu, type NuiMenuEntry } from '@numior/vue';

const last = ref('');

const entries: NuiMenuEntry[] = [
  { label: 'Открыть', icon: 'eye', onSelect: () => (last.value = 'Открыть') },
  { label: 'Скопировать ссылку', icon: 'link', onSelect: () => (last.value = 'Ссылка') },
  { type: 'separator' },
  {
    label: 'Отменить заказ',
    icon: 'trash',
    tone: 'error',
    onSelect: () => (last.value = 'Отмена'),
  },
];
</script>
