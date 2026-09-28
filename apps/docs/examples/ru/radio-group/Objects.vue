<template>
  <div class="flex flex-col gap-3">
    <NuiRadioGroup v-model="warehouse" label="Склад отгрузки">
      <NuiRadio v-for="item in warehouses" :key="item.code" :value="item">
        {{ item.city }} · {{ item.code }}
      </NuiRadio>
    </NuiRadioGroup>
    <p class="text-sm text-muted-foreground">Выбран: {{ warehouse?.city ?? '—' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiRadio, NuiRadioGroup } from '@numior/vue';

interface Warehouse {
  readonly code: string;
  readonly city: string;
}

const warehouses: Warehouse[] = [
  { code: 'MSK-1', city: 'Москва' },
  { code: 'EKB-2', city: 'Екатеринбург' },
];

const warehouse = ref<Warehouse | null>(warehouses[0] ?? null);
</script>
