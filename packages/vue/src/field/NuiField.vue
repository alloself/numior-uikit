<script setup lang="ts">
import { useSlots } from 'vue';
import { provideField } from '@numior/primitives';
import NuiFieldDescription from './NuiFieldDescription.vue';
import NuiFieldError from './NuiFieldError.vue';
import NuiFieldLabel from './NuiFieldLabel.vue';
import type { NuiFieldProps } from './field.types';

const props = withDefaults(defineProps<NuiFieldProps>(), {
  invalid: false,
  required: false,
  disabled: false,
  group: false,
});
const slots = useSlots();
const hasLabel = () => Boolean(props.label || slots.label);
const hasDescription = () => Boolean(props.description || slots.description);
const hasError = () => Boolean(props.error || slots.error);
const field = provideField({
  id: () => props.id,
  invalid: () => props.invalid,
  required: () => props.required,
  disabled: () => props.disabled,
  hasDescription,
  hasError,
  labelable: () => !props.group,
});
const isInvalid = field.invalid;
const isRequired = field.required;
const isDisabled = field.disabled;
</script>

<template>
  <component
    :is="group ? 'fieldset' : 'div'"
    class="nui-field"
    :data-invalid="isInvalid || undefined"
    :data-required="isRequired || undefined"
    :data-disabled="isDisabled || undefined"
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
  </component>
</template>
