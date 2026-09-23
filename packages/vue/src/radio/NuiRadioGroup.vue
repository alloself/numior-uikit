<template>
  <div
    :id="attrs.id"
    role="radiogroup"
    class="nui-radio-group"
    :class="[
      `nui-radio-group--orientation-${orientation}`,
      `nui-radio-group--size-${size}`,
      { 'nui-radio-group--invalid': isInvalid, 'nui-radio-group--disabled': isDisabled },
    ]"
    :aria-labelledby="labelledBy"
    :aria-describedby="attrs['aria-describedby']"
    :aria-invalid="attrs['aria-invalid']"
    :aria-required="isRequired || undefined"
    :aria-disabled="isDisabled || undefined"
  >
    <slot />
  </div>
</template>

<script setup lang="ts" generic="T">
import { computed } from 'vue';
import { provideRadioGroup, useField, useFieldControl } from '@numior/primitives';
import type { NuiRadioGroupProps } from './radio.types';

const {
  id,
  size = 'md',
  disabled = undefined,
  required = undefined,
  invalid = undefined,
  name,
  orientation = 'vertical',
} = defineProps<NuiRadioGroupProps>();
const model = defineModel<T>();
const field = useField();
const {
  attrs,
  invalid: isInvalid,
  required: isRequired,
  disabled: isDisabled,
} = useFieldControl(() => ({ id, disabled, required, invalid }), { group: true });
const labelledBy = computed(() => field?.labelledBy.value);

provideRadioGroup<T>({
  name: computed(() => name ?? attrs.value.id),
  modelValue: model,
  disabled: isDisabled,
  invalid: isInvalid,
  select: (value) => {
    model.value = value;
  },
});
</script>
