<template>
  <NuiFieldFrame
    :field="field"
    :own="true"
    :group="group"
    :reserve-error="reserveError"
    :label="label"
    :description="description"
    :error="error"
  >
    <template v-if="$slots.label" #label><slot name="label" /></template>
    <slot />
    <template v-if="$slots.description" #description><slot name="description" /></template>
    <template v-if="$slots.error" #error><slot name="error" /></template>
  </NuiFieldFrame>
</template>

<script setup lang="ts">
import { useSlots } from 'vue';
import { provideField } from '@numior/primitives';
import NuiFieldFrame from './NuiFieldFrame.vue';
import type { NuiFieldProps } from './field.types';

const {
  id,
  label,
  description,
  error,
  invalid = false,
  required = false,
  disabled = false,
  readonly = false,
  group = false,
  reserveError = false,
} = defineProps<NuiFieldProps>();

const slots = useSlots();
const hasLabel = () => Boolean(label || slots.label);
const hasDescription = () => Boolean(description || slots.description);
const hasError = () => Boolean(error || slots.error);

const field = provideField({
  id: () => id,
  invalid: () => invalid,
  required: () => required,
  disabled: () => disabled,
  readonly: () => readonly,
  hasLabel,
  hasDescription,
  hasError,
  labelable: () => !group,
});
</script>
