<template>
  <div
    :id="attrs.id"
    role="group"
    class="nui-checkbox-group"
    :class="[
      `nui-checkbox-group--orientation-${orientation}`,
      { 'nui-checkbox-group--invalid': isInvalid, 'nui-checkbox-group--disabled': isDisabled },
    ]"
    :aria-labelledby="labelledBy"
    :aria-describedby="attrs['aria-describedby']"
    :aria-invalid="attrs['aria-invalid']"
    :aria-required="isRequired || undefined"
    :aria-disabled="isDisabled || undefined"
  >
    <NuiCheckbox
      v-for="option in options"
      :key="keyOf(option.value)"
      :size="size"
      :disabled="option.disabled || undefined"
      :value="keyOf(option.value)"
      :model-value="checkedKeys.has(keyOf(option.value))"
      @update:model-value="(checked) => toggle(option.value, checked)"
    >
      <slot name="option" :option="option">{{ option.label }}</slot>
    </NuiCheckbox>
  </div>
</template>

<script setup lang="ts" generic="T">
import { computed } from 'vue';
import { useFieldContext, useFieldControl } from '@numior/primitives';
import { defaultOptionKey } from '../shared/options';
import NuiCheckbox from './NuiCheckbox.vue';
import { provideCheckboxGroup } from './checkbox-group-context';
import type { NuiCheckboxGroupProps } from './checkbox.types';

const {
  id,
  size = 'md',
  disabled = undefined,
  required = undefined,
  invalid = undefined,
  options,
  name,
  orientation = 'vertical',
  getKey,
} = defineProps<NuiCheckboxGroupProps<T>>();

const model = defineModel<T[]>({ default: () => [] });
const field = useFieldContext();

const {
  attrs,
  invalid: isInvalid,
  required: isRequired,
  disabled: isDisabled,
} = useFieldControl(() => ({ id, disabled, required, invalid }), { group: true });

const labelledBy = computed(() => field?.labelledBy.value);
const keyOf = (value: T): string => (getKey ?? defaultOptionKey)(value);
const checkedKeys = computed(() => new Set(model.value.map(keyOf)));

const toggle = (value: T, checked: boolean): void => {
  const key = keyOf(value);
  const others = model.value.filter((item) => keyOf(item) !== key);

  model.value = checked ? [...others, value] : others;
};

provideCheckboxGroup({
  name: computed(() => name ?? attrs.value.id),
  disabled: isDisabled,
  invalid: isInvalid,
});
</script>
