<template>
  <NuiStepper :steps="steps" v-bind="props" v-model="model" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NuiStepper, type NuiStepperProps, type NuiStepperStepDescriptor } from '../../src';

const {
  steps,
  initialValue,
  props = {},
} = defineProps<{
  steps: readonly NuiStepperStepDescriptor[];
  initialValue: string;
  props?: Partial<Omit<NuiStepperProps, 'steps'>> | undefined;
}>();

const model = ref(initialValue);

defineExpose({ model });
</script>
