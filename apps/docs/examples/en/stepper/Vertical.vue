<template>
  <NuiStepper
    v-model="step"
    :steps="steps"
    orientation="vertical"
    :linear="false"
    label="New product"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiStepper, type NuiStepperStepDescriptor } from '@numior/kit';

const steps: NuiStepperStepDescriptor[] = [
  { value: 'details', label: 'Details', description: 'Name and category', status: 'complete' },
  { value: 'price', label: 'Price', description: 'The sale price is missing', status: 'error' },
  { value: 'photos', label: 'Photos', description: 'Up to ten pictures' },
  { value: 'publish', label: 'Publishing', disabled: true },
];

const step = ref('photos');
</script>
