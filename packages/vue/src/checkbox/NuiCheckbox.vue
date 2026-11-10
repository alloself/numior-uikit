<template>
  <NuiFieldFrame v-bind="fieldFrame" :reserve-error="reserveError" :inline="true">
    <label
      class="nui-checkbox"
      :class="[
        `nui-checkbox--size-${size}`,
        {
          'nui-checkbox--checked': model,
          'nui-checkbox--indeterminate': indeterminate,
          'nui-checkbox--invalid': isInvalid,
          'nui-checkbox--disabled': isDisabled,
          'nui-checkbox--readonly': isReadonly,
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
        @click="onClick"
        @change="onChange"
      />
      <span class="nui-checkbox__box">
        <NuiIcon :icon="indeterminate ? 'minus' : 'check'" class="nui-checkbox__mark" />
      </span>
      <span v-if="$slots.default || label" class="nui-checkbox__label">
        <slot>{{ label }}</slot>
      </span>
    </label>
  </NuiFieldFrame>
</template>

<script setup lang="ts">
import { computed, nextTick, useTemplateRef, watchPostEffect } from 'vue';
import { useFieldControl, useSplitAttrs } from '@numior/primitives';
import NuiFieldFrame from '../field/NuiFieldFrame.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import { useCheckboxGroup } from './checkbox-group-context';
import type { NuiCheckboxProps } from './checkbox.types';
import { NuiSize } from '../shared/scale.types';

defineOptions({ inheritAttrs: false });

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
  indeterminate = false,
  value,
} = defineProps<NuiCheckboxProps>();

const model = defineModel<boolean>({ default: false });
const split = useSplitAttrs();
const group = useCheckboxGroup();

const {
  frame: fieldFrame,
  attrs: controlAttrs,
  invalid: isInvalid,
  disabled: isDisabled,
  readonly: isReadonly,
} = useFieldControl(
  () => ({
    id,
    required,
    disabled: disabled ?? group?.disabled.value,
    readonly: readonly ?? group?.readonly.value,
    invalid: invalid ?? group?.invalid.value,
    label,
    description,
    error,
  }),
  { detached: group !== null, inlineLabel: true, readonlyAttr: 'aria-readonly' },
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

const onClick = (event: MouseEvent): void => {
  if (isReadonly.value) {
    event.preventDefault();
  }
};

const onChange = (): void => {
  const element = checkboxElement.value;
  if (!element) {
    return;
  }
  model.value = element.checked;

  void nextTick(() => {
    if (checkboxElement.value) {
      checkboxElement.value.checked = model.value;
      checkboxElement.value.indeterminate = indeterminate;
    }
  });
};
</script>
