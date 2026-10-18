<template>
  <NuiFieldFrame v-bind="fieldFrame" :reserve-error="reserveError">
    <div
      class="nui-input"
      :class="[
        `nui-input--size-${size}`,
        {
          'nui-input--invalid': isInvalid,
          'nui-input--disabled': isDisabled,
          'nui-input--readonly': isReadonly,
        },
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
        :value="draft"
        @input="onInput"
        @change="onChange"
      />
      <span v-if="$slots.suffix" class="nui-input__suffix">
        <slot name="suffix" />
      </span>
    </div>
  </NuiFieldFrame>
</template>

<script setup lang="ts">
import { ref, useTemplateRef, watch } from 'vue';
import { applyMask, maskCaret, useFieldControl, useSplitAttrs } from '@numior/primitives';
import NuiFieldFrame from '../field/NuiFieldFrame.vue';
import type { NuiInputModifiers, NuiInputProps } from './input.types';

const isBackspace = (event: Event): boolean =>
  event instanceof InputEvent && event.inputType === 'deleteContentBackward';

defineOptions({ inheritAttrs: false });

const {
  id,
  size = 'md',
  disabled = undefined,
  required = undefined,
  invalid = undefined,
  label,
  description,
  error,
  reserveError = false,
  type = 'text',
  readonly = undefined,
  mask,
} = defineProps<NuiInputProps>();

const [model, modifiers] = defineModel<string, NuiInputModifiers>({ default: '' });
const split = useSplitAttrs();

const {
  frame: fieldFrame,
  attrs: controlAttrs,
  invalid: isInvalid,
  disabled: isDisabled,
  readonly: isReadonly,
} = useFieldControl(
  () => ({ id, disabled, readonly, required, invalid, label, description, error }),
  { commit: () => commitDraft() },
);

const inputElement = useTemplateRef<HTMLInputElement>('input');
const display = (value: string): string => (mask ? applyMask(value, mask).masked : value);

const outgoing = (text: string): string =>
  mask && modifiers.unmasked ? applyMask(text, mask).raw : text;

const draft = ref(display(model.value));
const state = { raw: mask ? applyMask(model.value, mask).raw : '' };

watch(model, (value) => {
  const mirrored = outgoing(modifiers.trim ? draft.value.trim() : draft.value);
  if (mirrored !== value) {
    draft.value = display(value);
    state.raw = mask ? applyMask(value, mask).raw : '';
  }
});

const reformat = (element: HTMLInputElement, pattern: string, event: Event): void => {
  const caret = element.selectionStart ?? element.value.length;
  let count = applyMask(element.value.slice(0, caret), pattern).raw.length;
  let raw = applyMask(element.value, pattern).raw;
  if (isBackspace(event) && raw === state.raw && count > 0) {
    raw = raw.slice(0, count - 1) + raw.slice(count);
    count -= 1;
  }
  const result = applyMask(raw, pattern);
  state.raw = result.raw;
  element.value = result.masked;
  const position = maskCaret(pattern, count, result.masked.length);
  element.setSelectionRange(position, position);
};

const onInput = (event: Event): void => {
  const element = inputElement.value;
  if (!element) {
    return;
  }
  if (mask) {
    reformat(element, mask, event);
  }
  draft.value = element.value;
  if (!modifiers.lazy) {
    model.value = outgoing(element.value);
  }
};

const onChange = (): void => {
  const element = inputElement.value;
  if (!element) {
    return;
  }
  if (modifiers.trim && !mask) {
    element.value = element.value.trim();
  }
  draft.value = element.value;
  model.value = outgoing(element.value);
};

const commitDraft = (): void => {
  if (modifiers.lazy) {
    onChange();
  }
};

defineExpose({ focus: () => inputElement.value?.focus() });
</script>
