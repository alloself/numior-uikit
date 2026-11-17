<template>
  <NuiToggleGroup
    v-model="view"
    :items="views"
    variant="segmented"
    required
    label="Вид списка заказов"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { LayoutGrid } from '@lucide/vue';
import { NuiToggleGroup, type NuiToggleItem } from '@numior/kit';

const view = ref<string | null>('table');

const views: readonly NuiToggleItem[] = [
  { value: 'table', label: 'Таблица', icon: 'table' },
  { value: 'cards', label: 'Карточки', icon: LayoutGrid },
];
</script>
