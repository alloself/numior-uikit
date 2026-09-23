<template>
  <div
    class="nui-input"
    :class="[
      `nui-input--size-${size}`,
      { 'nui-input--invalid': isInvalid, 'nui-input--disabled': isDisabled },
    ]"
    v-bind="split.rootAttrs()"
  >
    <span v-if="$slots.prefix" class="nui-input__prefix">
      <slot name="prefix" />
    </span>
    <input
      ref="input"
      class="nui-input__control"
      v-bind="{ ...controlAttrs, ...split.controlAttrs() }"
      :type="type"
      :readonly="readonly || undefined"
      :value="draft"
      @input="onInput"
      @change="onChange"
    />
    <span v-if="$slots.suffix" class="nui-input__suffix">
      <slot name="suffix" />
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, useTemplateRef, watch } from 'vue';
import { useFieldControl, useSplitAttrs } from '@numior/primitives';
import type { NuiInputModifiers, NuiInputProps } from './input.types';

defineOptions({ inheritAttrs: false });
const {
  id,
  size = 'md',
  disabled = undefined,
  required = undefined,
  invalid = undefined,
  type = 'text',
  readonly = false,
} = defineProps<NuiInputProps>();
const [model, modifiers] = defineModel<string, NuiInputModifiers>({ default: '' });
const split = useSplitAttrs();
const {
  attrs: controlAttrs,
  invalid: isInvalid,
  disabled: isDisabled,
} = useFieldControl(() => ({ id, disabled, required, invalid }));
const inputElement = useTemplateRef<HTMLInputElement>('input');
const draft = ref(model.value);

watch(model, (value) => {
  if (!(modifiers.trim && draft.value.trim() === value)) {
    draft.value = value;
  }
});

const onInput = (): void => {
  const element = inputElement.value;
  if (!element) {
    return;
  }
  draft.value = element.value;
  if (!modifiers.lazy) {
    model.value = element.value;
  }
};

const onChange = (): void => {
  const element = inputElement.value;
  if (!element) {
    return;
  }
  if (modifiers.trim) {
    element.value = element.value.trim();
  }
  draft.value = element.value;
  model.value = element.value;
};

defineExpose({ focus: () => inputElement.value?.focus() });
</script>
