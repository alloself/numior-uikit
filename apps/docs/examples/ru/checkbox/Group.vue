<template>
  <NuiCheckboxGroup
    v-model:values="enabled"
    :options="methods"
    label="Способы доставки"
    description="Покупатель выберет один из них при оформлении заказа"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiCheckboxGroup } from '@numior/kit';
import { DELIVERIES } from '#demo/orders';

const REQUIRED = 'courier';

const enabled = ref([REQUIRED, 'pickup']);

const methods = Object.entries(DELIVERIES).map(([value, label]) => ({
  value,
  label,
  disabled: value === REQUIRED,
}));
</script>
