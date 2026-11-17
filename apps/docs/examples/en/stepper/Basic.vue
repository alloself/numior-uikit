<template>
  <div class="flex flex-col gap-4 w-full max-w-2xl">
    <NuiStepper v-model="step" :steps="steps" label="Checkout" />
    <div class="flex justify-end gap-2">
      <NuiButton variant="ghost" tone="neutral" :disabled="index === 0" @click="move(-1)"
        >Back</NuiButton
      >
      <NuiButton :disabled="index === steps.length - 1" @click="move(1)">Next</NuiButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NuiButton, NuiStepper, type NuiStepperStep } from '@numior/kit';

const steps: NuiStepperStep[] = [
  { value: 'cart', label: 'Cart', description: 'Dresser and lamp' },
  { value: 'delivery', label: 'Delivery', description: 'Courier or pickup' },
  { value: 'payment', label: 'Payment', description: 'Card or bank transfer' },
  { value: 'done', label: 'Done' },
];

const step = ref('delivery');
const index = computed(() => steps.findIndex((item) => item.value === step.value));

const move = (delta: number): void => {
  step.value = steps[index.value + delta]?.value ?? step.value;
};
</script>
