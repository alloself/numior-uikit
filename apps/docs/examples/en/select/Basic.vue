<template>
  <NuiSelect
    v-model="status"
    :options="statuses"
    label="Order status"
    description="The customer gets an email about the new status"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiSelect } from '@numior/vue';
import { ORDER_STATUSES } from '#demo/orders';

const status = ref<string | null>('paid');

const statuses = Object.entries(ORDER_STATUSES).map(([value, label]) => ({ value, label }));
</script>
