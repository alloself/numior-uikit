<template>
  <NuiMenu :items="entries" placement="bottom-end" label="Действия с заказом">
    <template #trigger="{ attrs }">
      <NuiButton v-bind="attrs" variant="ghost" tone="neutral" aria-label="Действия">
        <NuiIcon alias="ellipsis" />
      </NuiButton>
    </template>
  </NuiMenu>
  <p class="text-sm text-muted-foreground">Действие: {{ last || 'не выбрано' }}</p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiButton, NuiIcon, NuiMenu, type NuiMenuEntry } from '@numior/vue';

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
