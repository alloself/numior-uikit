<template>
  <component
    :is="group ? 'fieldset' : 'div'"
    v-if="own"
    class="nui-field"
    :class="classes"
    :disabled="fieldsetDisabled"
  >
    <NuiFieldLabel v-if="hasLabel" :field="field">
      <slot name="label">{{ label }}</slot>
    </NuiFieldLabel>
    <slot />
    <NuiFieldDescription v-if="hasDescription" :field="field">
      <slot name="description">{{ description }}</slot>
    </NuiFieldDescription>
    <NuiFieldError v-if="hasError" :field="field">
      <slot name="error">{{ error }}</slot>
    </NuiFieldError>
    <span v-else-if="reserveError" class="nui-field__reserve" aria-hidden="true"></span>
  </component>
  <slot v-else />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import NuiFieldDescription from './NuiFieldDescription.vue';
import NuiFieldError from './NuiFieldError.vue';
import NuiFieldLabel from './NuiFieldLabel.vue';
import type { NuiFieldFrameProps } from './field.types';

const {
  field,
  own,
  label,
  description,
  error,
  reserveError = false,
  group = false,
  inline = false,
} = defineProps<NuiFieldFrameProps>();

const slots = defineSlots<{
  default?: () => unknown;
  label?: () => unknown;
  description?: () => unknown;
  error?: () => unknown;
}>();

const classes = computed(() => ({
  'nui-field--group': group,
  'nui-field--inline': inline,
  'nui-field--invalid': field.invalid.value,
  'nui-field--required': field.required.value,
  'nui-field--disabled': field.disabled.value,
  'nui-field--readonly': field.readonly.value,
  'nui-field--reserve-error': reserveError,
}));

const fieldsetDisabled = computed(() => (group && field.disabled.value ? true : undefined));

const hasLabel = computed(() => !inline && (slots.label !== undefined || Boolean(label)));

const hasDescription = computed(() => slots.description !== undefined || Boolean(description));

const hasError = computed(() => slots.error !== undefined || Boolean(error));
</script>
