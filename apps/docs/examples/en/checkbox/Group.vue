<template>
  <NuiCheckboxGroup
    v-model="enabled"
    :options="methods"
    label="Delivery methods"
    description="The customer picks one of them at checkout"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiCheckboxGroup } from '@numior/vue';
import { DELIVERIES } from '#demo/orders';

const REQUIRED = 'courier';

const enabled = ref([REQUIRED, 'pickup']);

const methods = Object.entries(DELIVERIES).map(([value, label]) => ({
  value,
  label,
  disabled: value === REQUIRED,
}));
</script>
