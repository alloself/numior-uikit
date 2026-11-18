<template>
  <li class="nui-stepper-step" :style="{ '--_numerals': stepper.numerals() }">
    <span class="nui-stepper-step__indicator" aria-hidden="true" />
    <div class="nui-stepper-step__title nui-not-prose">
      <slot name="title">{{ title }}</slot>
    </div>
    <div v-if="$slots.default" class="nui-stepper-step__content">
      <slot />
    </div>
    <span class="nui-stepper-step__connector" aria-hidden="true" />
  </li>
</template>

<script setup lang="ts">
import { useStepper } from './stepper-context';
import type { NuiStepperStepProps } from './stepper.types';

const { title } = defineProps<NuiStepperStepProps>();

defineSlots<{ title?(): unknown; default?(): unknown }>();

const stepper = useStepper();
</script>
