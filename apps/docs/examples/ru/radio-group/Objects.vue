<template>
  <NuiRadioGroup
    v-model="warehouse"
    label="Склад отгрузки"
    :description="`Заказ соберут на складе ${warehouse.code}, ${warehouse.city}`"
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

const main: Warehouse = { code: 'MSK-1', city: 'Москва' };
const warehouses: Warehouse[] = [main, { code: 'EKB-2', city: 'Екатеринбург' }];

const warehouse = ref(main);
</script>
