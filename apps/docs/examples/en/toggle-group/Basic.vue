<template>
  <NuiToggleGroup
    v-model="view"
    :items="views"
    variant="segmented"
    required
    label="Order list view"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { LayoutGrid } from '@lucide/vue';
import { NuiToggleGroup, type NuiToggleItem } from '@numior/kit';

const view = ref<string | null>('table');

const views: readonly NuiToggleItem[] = [
  { value: 'table', label: 'Table', icon: 'table' },
  { value: 'cards', label: 'Cards', icon: LayoutGrid },
];
</script>
