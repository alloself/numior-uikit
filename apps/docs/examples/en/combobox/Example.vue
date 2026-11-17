<template>
  <NuiCombobox v-model="customer" :options="buyers" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiCombobox } from '@numior/kit';
import { customers } from '#demo/customers';

const customer = ref<number | null>(null);
const buyers = customers.map((person) => ({ value: person.id, label: person.name }));
</script>
