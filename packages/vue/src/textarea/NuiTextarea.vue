<template>
  <NuiFieldFrame v-bind="fieldFrame" :reserve-error="reserveError">
    <textarea
      ref="textarea"
      class="nui-textarea"
      :class="[
        `nui-textarea--size-${size}`,
        `nui-textarea--resize-${resize}`,
        { 'nui-textarea--invalid': isInvalid },
      ]"
      v-bind="{ ...controlAttrs, ...attrs }"
      :rows="rows"
      :readonly="readonly || undefined"
      :value="draft"
      @input="onInput"
      @change="onChange"
    />
  </NuiFieldFrame>
</template>

<script setup lang="ts">
import { ref, useAttrs, useTemplateRef, watch } from 'vue';
import { useFieldControl } from '@numior/primitives';
import NuiFieldFrame from '../field/NuiFieldFrame';
import type { NuiTextareaModifiers, NuiTextareaProps } from './textarea.types';

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
  rows = 3,
  resize = 'vertical',
  readonly = false,
} = defineProps<NuiTextareaProps>();

const [model, modifiers] = defineModel<string, NuiTextareaModifiers>({ default: '' });
const attrs = useAttrs();

const {
  attrs: controlAttrs,
  invalid: isInvalid,
  frame: fieldFrame,
} = useFieldControl(() => ({ id, disabled, required, invalid, label, description, error }), {
  commit: () => commitDraft(),
});

const textareaElement = useTemplateRef<HTMLTextAreaElement>('textarea');
const draft = ref(model.value);

watch(model, (value) => {
  if (!(modifiers.trim && draft.value.trim() === value)) {
    draft.value = value;
  }
});

const onInput = (): void => {
  const element = textareaElement.value;
  if (!element) {
    return;
  }
  draft.value = element.value;
  if (!modifiers.lazy) {
    model.value = element.value;
  }
};

const onChange = (): void => {
  const element = textareaElement.value;
  if (!element) {
    return;
  }
  if (modifiers.trim) {
    element.value = element.value.trim();
  }
  draft.value = element.value;
  model.value = element.value;
};

const commitDraft = (): void => {
  if (modifiers.lazy) {
    onChange();
  }
};

defineExpose({ focus: () => textareaElement.value?.focus() });
</script>
