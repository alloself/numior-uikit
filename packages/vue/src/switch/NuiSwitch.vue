<template>
  <NuiFieldFrame v-bind="fieldFrame" :reserve-error="reserveError" :inline="true">
    <label
      class="nui-switch"
      :class="[
        `nui-switch--size-${size}`,
        {
          'nui-switch--checked': model,
          'nui-switch--invalid': isInvalid,
          'nui-switch--disabled': isDisabled,
          'nui-switch--readonly': isReadonly,
        },
      ]"
      v-bind="split.rootAttrs()"
    >
      <input
        ref="switch"
        type="checkbox"
        role="switch"
        class="nui-switch__control"
        v-bind="{ ...controlAttrs, ...split.controlAttrs() }"
        :checked="model"
        @click="onClick"
        @change="onChange"
      />
      <span class="nui-switch__track">
        <span class="nui-switch__thumb"></span>
      </span>
      <span v-if="$slots.default || label" class="nui-switch__label">
        <slot>{{ label }}</slot>
      </span>
    </label>
  </NuiFieldFrame>
</template>

<script setup lang="ts">
import { nextTick, useTemplateRef } from 'vue';
import { useFieldControl, useSplitAttrs } from '@numior/primitives';
import NuiFieldFrame from '../field/NuiFieldFrame';
import type { NuiSwitchProps } from './switch.types';

defineOptions({ inheritAttrs: false });

const {
  id,
  size = 'md',
  disabled = undefined,
  readonly = undefined,
  required = undefined,
  invalid = undefined,
  label,
  description,
  error,
  reserveError = false,
} = defineProps<NuiSwitchProps>();

const model = defineModel<boolean>({ default: false });
const split = useSplitAttrs();

const {
  frame: fieldFrame,
  attrs: controlAttrs,
  invalid: isInvalid,
  disabled: isDisabled,
  readonly: isReadonly,
} = useFieldControl(
  () => ({ id, disabled, readonly, required, invalid, label, description, error }),
  { inlineLabel: true, readonlyAttr: 'aria-readonly' },
);

const switchElement = useTemplateRef<HTMLInputElement>('switch');

const onClick = (event: MouseEvent): void => {
  if (isReadonly.value) {
    event.preventDefault();
  }
};

const onChange = (): void => {
  const element = switchElement.value;
  if (!element) {
    return;
  }
  model.value = element.checked;

  void nextTick(() => {
    if (switchElement.value) {
      switchElement.value.checked = model.value;
    }
  });
};
</script>
