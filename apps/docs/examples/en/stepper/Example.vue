<template>
  <NuiStepper v-model="stage" :steps="stages" class="w-full" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiStepper, type NuiStepperStep } from '@numior/kit';

const stage = ref('shipped');

const stages: NuiStepperStep[] = [
  { value: 'pending', label: 'Awaiting payment' },
  { value: 'paid', label: 'Paid' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
];
</script>
