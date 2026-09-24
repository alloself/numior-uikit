<template>
  <label
    class="nui-checkbox"
    :class="[
      `nui-checkbox--size-${size}`,
      {
        'nui-checkbox--checked': checked,
        'nui-checkbox--indeterminate': indeterminate,
        'nui-checkbox--invalid': isInvalid,
        'nui-checkbox--disabled': isDisabled,
      },
    ]"
    v-bind="split.rootAttrs()"
  >
    <input
      ref="checkbox"
      type="checkbox"
      class="nui-checkbox__control"
      v-bind="{ ...controlAttrs, ...split.controlAttrs() }"
      :value="value === undefined ? undefined : String(value)"
      :checked="checked"
      @change="onChange"
    />
    <span class="nui-checkbox__box">
      <NuiIcon :alias="indeterminate ? 'minus' : 'check'" class="nui-checkbox__mark" />
    </span>
    <span v-if="$slots.default" class="nui-checkbox__label">
      <slot />
    </span>
  </label>
</template>

<script setup lang="ts" generic="T">
import { nextTick, useTemplateRef, watchPostEffect } from 'vue';
import { useCheckedState, useFieldControl, useSplitAttrs } from '@numior/primitives';
import NuiIcon from '../icon/NuiIcon.vue';
import type { NuiCheckboxProps } from './checkbox.types';

defineOptions({ inheritAttrs: false });

const {
  id,
  size = 'md',
  disabled = undefined,
  required = undefined,
  invalid = undefined,
  indeterminate = false,
  value,
} = defineProps<NuiCheckboxProps<T>>();

const model = defineModel<boolean | T[]>();
const split = useSplitAttrs();

const {
  attrs: controlAttrs,
  invalid: isInvalid,
  disabled: isDisabled,
} = useFieldControl(() => ({ id, disabled, required, invalid }));

const { checked, setChecked } = useCheckedState<T>(model, () => value);
const checkboxElement = useTemplateRef<HTMLInputElement>('checkbox');

watchPostEffect(() => {
  if (checkboxElement.value) {
    checkboxElement.value.indeterminate = indeterminate;
  }
});

const onChange = (): void => {
  const element = checkboxElement.value;
  if (!element) {
    return;
  }
  setChecked(element.checked);

  void nextTick(() => {
    if (checkboxElement.value) {
      checkboxElement.value.checked = checked.value;
    }
  });
};
</script>
