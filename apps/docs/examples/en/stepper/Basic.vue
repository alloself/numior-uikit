<template>
  <div class="flex flex-col gap-4 w-full max-w-lg">
    <NuiStepper v-model="step" :steps="steps" label="Sign up" />
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
import { NuiButton, NuiStepper, type NuiStepperStep } from '@numior/vue';

const steps: NuiStepperStep[] = [
  { value: 'account', label: 'Account', description: 'Email and password' },
  { value: 'profile', label: 'Profile', description: 'Name and company' },
  { value: 'team', label: 'Team' },
  { value: 'done', label: 'Done' },
];

const step = ref('profile');
const index = computed(() => steps.findIndex((item) => item.value === step.value));

const move = (delta: number): void => {
  step.value = steps[index.value + delta]?.value ?? step.value;
};
</script>
