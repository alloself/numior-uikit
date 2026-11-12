<template>
  <NuiRadioGroup v-model="warehouse" label="Warehouse" :get-key="keyed ? codeOf : undefined">
    <NuiRadio v-for="item in WAREHOUSES" :key="item.code" :value="item">{{ item.city }}</NuiRadio>
  </NuiRadioGroup>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiRadio, NuiRadioGroup } from '../../src';

interface Warehouse {
  readonly code: string;
  readonly city: string;
  readonly stock: number;
}

type WarehouseStart = 'saved' | 'restocked' | 'none';

const { keyed = false, start = 'saved' } = defineProps<{
  keyed?: boolean | undefined;
  start?: WarehouseStart | undefined;
}>();

const MOSCOW: Warehouse = { code: 'MSK', city: 'Moscow', stock: 12 };
const YEKATERINBURG: Warehouse = { code: 'EKB', city: 'Yekaterinburg', stock: 4 };
const WAREHOUSES: readonly Warehouse[] = [MOSCOW, YEKATERINBURG];

const STARTS: Readonly<Record<WarehouseStart, Warehouse | undefined>> = {
  saved: YEKATERINBURG,
  restocked: { ...YEKATERINBURG, stock: 9 },
  none: undefined,
};

const codeOf = (item: Warehouse): string => item.code;

const warehouse = ref<Warehouse | undefined>(STARTS[start]);
</script>
