<template>
  <NuiTabs
    v-model="period"
    :tabs="periods"
    variant="soft"
    size="sm"
    activation="manual"
    label="Period"
  >
    <template #panel="{ tab }">
      <p class="text-sm">Sales for the “{{ tab.label }}” period.</p>
    </template>
  </NuiTabs>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiTabs, type NuiTabDescriptor } from '@numior/vue';

const period = ref('week');

const periods: NuiTabDescriptor[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];
</script>
