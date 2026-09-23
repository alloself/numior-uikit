<template>
  <label
    class="nui-switch"
    :class="[
      `nui-switch--size-${size}`,
      {
        'nui-switch--checked': model,
        'nui-switch--invalid': isInvalid,
        'nui-switch--disabled': isDisabled,
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
      @change="onChange"
    />
    <span class="nui-switch__track">
      <span class="nui-switch__thumb"></span>
    </span>
    <span v-if="$slots.default" class="nui-switch__label">
      <slot />
    </span>
  </label>
</template>

<script setup lang="ts">
import { nextTick, useTemplateRef } from 'vue';
import { useFieldControl, useSplitAttrs } from '@numior/primitives';
import type { NuiSwitchProps } from './switch.types';

defineOptions({ inheritAttrs: false });
const {
  id,
  size = 'md',
  disabled = undefined,
  required = undefined,
  invalid = undefined,
} = defineProps<NuiSwitchProps>();
const model = defineModel<boolean>({ default: false });
const split = useSplitAttrs();
const {
  attrs: controlAttrs,
  invalid: isInvalid,
  disabled: isDisabled,
} = useFieldControl(() => ({ id, disabled, required, invalid }));
const switchElement = useTemplateRef<HTMLInputElement>('switch');

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
