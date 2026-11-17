<template>
  <NuiRadioGroup
    v-model="warehouse"
    label="Shipping warehouse"
    :description="`The order is packed at ${warehouse.code}, ${warehouse.city}`"
  >
    <NuiRadio v-for="item in warehouses" :key="item.code" :value="item">
      {{ item.city }}
    </NuiRadio>
  </NuiRadioGroup>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiRadio, NuiRadioGroup } from '@numior/kit';

interface Warehouse {
  readonly code: string;
  readonly city: string;
}

const main: Warehouse = { code: 'BOS-1', city: 'Boston' };
const warehouses: Warehouse[] = [main, { code: 'DEN-2', city: 'Denver' }];

const warehouse = ref(main);
</script>
