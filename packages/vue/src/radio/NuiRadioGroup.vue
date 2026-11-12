<template>
  <NuiFieldFrame v-bind="fieldFrame" :reserve-error="reserveError" :group="true">
    <div
      :id="attrs.id"
      role="radiogroup"
      class="nui-radio-group"
      :class="[
        `nui-radio-group--orientation-${orientation}`,
        `nui-radio-group--size-${size}`,
        {
          'nui-radio-group--invalid': isInvalid,
          'nui-radio-group--disabled': isDisabled,
          'nui-radio-group--readonly': isReadonly,
        },
      ]"
      :aria-labelledby="labelledBy"
      :aria-describedby="attrs['aria-describedby']"
      :aria-invalid="attrs['aria-invalid']"
      :aria-readonly="attrs['aria-readonly']"
      :aria-required="isRequired || undefined"
      :aria-disabled="isDisabled || undefined"
      v-bind="passthrough"
    >
      <slot>
        <NuiRadio
          v-for="option in options"
          :key="keyOf(option.value)"
          :value="option.value"
          :disabled="option.disabled || undefined"
        >
          <slot name="option" :option="option">{{ option.label }}</slot>
        </NuiRadio>
      </slot>
    </div>
  </NuiFieldFrame>
</template>

<script setup lang="ts" generic="T">
import { computed, useAttrs } from 'vue';
import { provideRadioGroup, useFieldControl } from '@numior/primitives';
import NuiFieldFrame from '../field/NuiFieldFrame.vue';
import { defaultOptionKey } from '../shared/options';
import NuiRadio from './NuiRadio.vue';
import { NuiRadioGroupOrientation, type NuiRadioGroupProps } from './radio.types';
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
  name,
  orientation = NuiRadioGroupOrientation.Vertical,
  options,
  getKey,
} = defineProps<NuiRadioGroupProps<T>>();

defineOptions({ inheritAttrs: false });

const passthrough = useAttrs();
const model = defineModel<T>({ required: true });

const {
  frame: fieldFrame,
  field,
  attrs,
  invalid: isInvalid,
  required: isRequired,
  disabled: isDisabled,
  readonly: isReadonly,
} = useFieldControl(
  () => ({ id, disabled, readonly, required, invalid, label, description, error }),
  { group: true, readonlyAttr: 'aria-readonly' },
);

const labelledBy = computed(() => field.value?.labelledBy.value);

const keyOf = (value: T): string => {
  if (getKey === undefined || value === undefined || value === null) {
    return defaultOptionKey(value);
  }

  return getKey(value);
};

const selectedKey = computed(() => (model.value === undefined ? undefined : keyOf(model.value)));

provideRadioGroup<T>({
  name: computed(() => name ?? attrs.value.id),
  modelValue: model,
  selectedKey,
  keyOf,
  disabled: isDisabled,
  readonly: isReadonly,
  invalid: isInvalid,
  select: (value) => {
    model.value = value;
  },
});
</script>
