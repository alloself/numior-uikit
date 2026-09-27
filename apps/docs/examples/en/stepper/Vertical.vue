<template>
  <NuiStepper
    v-model="step"
    :steps="steps"
    orientation="vertical"
    :linear="false"
    label="Project settings"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiStepper, type NuiStepperStep } from '@numior/vue';

const steps: NuiStepperStep[] = [
  { value: 'general', label: 'General', description: 'Name and description', status: 'complete' },
  { value: 'access', label: 'Access', description: 'Roles and invitations', status: 'error' },
  { value: 'integrations', label: 'Integrations' },
  { value: 'billing', label: 'Billing', disabled: true },
];

const step = ref('integrations');
</script>
