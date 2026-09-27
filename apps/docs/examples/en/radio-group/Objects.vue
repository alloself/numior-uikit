<template>
  <NuiRadioGroup v-model="warehouse" label="Shipping warehouse">
    <NuiRadio v-for="item in warehouses" :key="item.code" :value="item">
      {{ item.city }} · {{ item.code }}
    </NuiRadio>
  </NuiRadioGroup>
  <p class="nui-text-sm nui-text-muted">Selected: {{ warehouse?.city ?? '—' }}</p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiRadio, NuiRadioGroup } from '@numior/vue';

interface Warehouse {
  readonly code: string;
  readonly city: string;
}

const warehouses: Warehouse[] = [
  { code: 'LIS-1', city: 'Lisbon' },
  { code: 'POR-2', city: 'Porto' },
];

const warehouse = ref<Warehouse | null>(warehouses[0] ?? null);
</script>
