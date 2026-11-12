<template>
  <div class="flex flex-col gap-3">
    <NuiSelect
      v-model="customer"
      :options="buyers"
      :get-key="keyOf"
      label="Customer"
      placeholder="Pick a customer"
    />
    <p class="m-0 text-sm text-muted-foreground">{{ receipt }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiSelect } from '@numior/vue';
import { customers, type Customer } from '#demo/customers';

const customer = ref<Customer | null>(null);

const buyers = customers.map((person) => ({
  value: person,
  label: person.name,
  description: person.city,
}));

const receipt = computed(() =>
  customer.value === null
    ? 'The receipt goes to the customer’s email'
    : `The receipt goes to ${customer.value.email}`,
);

const keyOf = (person: Customer): string => String(person.id);
</script>
