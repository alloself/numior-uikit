<template>
  <NuiFieldFrame v-bind="fieldFrame" :reserve-error="reserveError" :group="true">
    <div
      :id="attrs.id"
      role="group"
      class="nui-checkbox-group"
      :class="[
        `nui-checkbox-group--orientation-${orientation}`,
        {
          'nui-checkbox-group--invalid': isInvalid,
          'nui-checkbox-group--disabled': isDisabled,
          'nui-checkbox-group--readonly': isReadonly,
        },
      ]"
      :aria-labelledby="labelledBy"
      :aria-describedby="attrs['aria-describedby']"
      :aria-invalid="attrs['aria-invalid']"
      :aria-disabled="isDisabled || undefined"
      v-bind="passthrough"
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
  </NuiFieldFrame>
</template>

<script setup lang="ts" generic="T">
import { computed, useAttrs } from 'vue';
import { useFieldControl } from '@numior/primitives';
import NuiFieldFrame from '../field/NuiFieldFrame.vue';
import { defaultOptionKey } from '../shared/options';
import NuiCheckbox from './NuiCheckbox.vue';
import { provideCheckboxGroup } from './checkbox-group-context';
import { NuiCheckboxGroupOrientation, type NuiCheckboxGroupProps } from './checkbox.types';
import { NuiSize } from '../shared/scale.types';

const {
  id,
  size = NuiSize.Md,
  disabled = undefined,
  readonly = undefined,
  required = undefined,
  invalid = undefined,
  label,
  description,
  error,
  reserveError = false,
  options,
  name,
  orientation = NuiCheckboxGroupOrientation.Vertical,
  getKey,
} = defineProps<NuiCheckboxGroupProps<T>>();

defineOptions({ inheritAttrs: false });

const passthrough = useAttrs();
const model = defineModel<T[]>({ default: () => [] });

const {
  frame: fieldFrame,
  field,
  attrs,
  invalid: isInvalid,
  disabled: isDisabled,
  readonly: isReadonly,
} = useFieldControl(
  () => ({ id, disabled, readonly, required, invalid, label, description, error }),
  { group: true },
);

const labelledBy = computed(() => field.value?.labelledBy.value);
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
  readonly: isReadonly,
  invalid: isInvalid,
});
</script>
