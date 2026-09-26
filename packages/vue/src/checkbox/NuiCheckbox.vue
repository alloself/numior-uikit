<template>
  <label
    class="nui-checkbox"
    :class="[
      `nui-checkbox--size-${size}`,
      {
        'nui-checkbox--checked': model,
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
      v-bind="{ ...controlAttrs, ...split.controlAttrs(), ...groupName }"
      :value="value"
      :checked="model"
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

<script setup lang="ts">
import { computed, nextTick, useTemplateRef, watchPostEffect } from 'vue';
import { useFieldControl, useSplitAttrs } from '@numior/primitives';
import NuiIcon from '../icon/NuiIcon.vue';
import { useCheckboxGroup } from './checkbox-group-context';
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
} = defineProps<NuiCheckboxProps>();

const model = defineModel<boolean>({ default: false });
const split = useSplitAttrs();
const group = useCheckboxGroup();

const {
  attrs: controlAttrs,
  invalid: isInvalid,
  disabled: isDisabled,
} = useFieldControl(
  () => ({
    id,
    required,
    disabled: disabled ?? group?.disabled.value,
    invalid: invalid ?? group?.invalid.value,
  }),
  { detached: group !== null },
);

const groupName = computed(() => {
  const name = group?.name.value;
  return name === undefined ? {} : { name };
});

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
  model.value = element.checked;

  void nextTick(() => {
    if (checkboxElement.value) {
      checkboxElement.value.checked = model.value;
    }
  });
};
</script>
