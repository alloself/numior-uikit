<template>
  <component
    :is="group ? 'fieldset' : 'div'"
    class="nui-field"
    :class="{
      'nui-field--group': group,
      'nui-field--invalid': isInvalid,
      'nui-field--required': isRequired,
      'nui-field--disabled': isDisabled,
      'nui-field--reserve-error': reserveError,
    }"
    :disabled="group && isDisabled ? true : undefined"
  >
    <NuiFieldLabel v-if="hasLabel()">
      <slot name="label">{{ label }}</slot>
    </NuiFieldLabel>
    <slot />
    <NuiFieldDescription v-if="hasDescription()">
      <slot name="description">{{ description }}</slot>
    </NuiFieldDescription>
    <NuiFieldError v-if="hasError()">
      <slot name="error">{{ error }}</slot>
    </NuiFieldError>
    <span v-else-if="reserveError" class="nui-field__reserve" aria-hidden="true"></span>
  </component>
</template>

<script setup lang="ts">
import { useSlots } from 'vue';
import { provideField } from '@numior/primitives';
import NuiFieldDescription from './NuiFieldDescription.vue';
import NuiFieldError from './NuiFieldError.vue';
import NuiFieldLabel from './NuiFieldLabel.vue';
import type { NuiFieldProps } from './field.types';

const {
  id,
  label,
  description,
  error,
  invalid = false,
  required = false,
  disabled = false,
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
  hasLabel,
  hasDescription,
  hasError,
  labelable: () => !group,
});

const isInvalid = field.invalid;
const isRequired = field.required;
const isDisabled = field.disabled;
</script>
