<template>
  <NuiRadioGroup v-model="delivery" :options="methods" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiRadioGroup } from '@numior/kit';
import { DELIVERIES } from '#demo/orders';

const delivery = ref('courier');
const methods = Object.entries(DELIVERIES).map(([value, label]) => ({ value, label }));
</script>
