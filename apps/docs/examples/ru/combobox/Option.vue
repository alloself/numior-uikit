<template>
  <NuiCombobox
    v-model="customer"
    :options="buyers"
    label="Покупатель"
    placeholder="Имя или фамилия"
  >
    <template #option="{ option }">
      <span class="flex items-baseline justify-between gap-4">
        <span>{{ option.label }}</span>
        <span class="text-xs text-muted-foreground">{{ summaryOf(option.value) }}</span>
      </span>
    </template>
  </NuiCombobox>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { plural } from '@numior/primitives';
import { NuiCombobox } from '@numior/vue';
import { customers, type Customer } from '#demo/customers';

const customer = ref<Customer | null>(null);

const buyers = customers.map((person) => ({ value: person, label: person.name }));

const summaryOf = (person: Customer): string =>
  `${person.city}, ${person.orders} ${plural('ru', person.orders, { one: 'заказ', few: 'заказа', many: 'заказов', other: 'заказа' })}`;
</script>
