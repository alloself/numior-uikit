<template>
  <NuiTabs
    v-model="period"
    :tabs="periods"
    variant="soft"
    size="sm"
    activation="manual"
    label="Период"
  >
    <template #panel="{ tab }">
      <p class="text-sm">Продажи за период «{{ tab.label }}».</p>
    </template>
  </NuiTabs>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTabs, type NuiTabDescriptor } from '@numior/vue';

const period = ref('week');

const periods: NuiTabDescriptor[] = [
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
];
</script>
