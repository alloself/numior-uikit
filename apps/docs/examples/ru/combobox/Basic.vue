<template>
  <NuiCombobox
    v-model="customer"
    :options="buyers"
    label="Покупатель"
    placeholder="Имя или фамилия"
    clearable
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiCombobox } from '@numior/vue';
import { customers } from '#demo/customers';

const customer = ref<number | null>(null);

const buyers = customers.map((person) => ({ value: person.id, label: person.name }));
</script>
