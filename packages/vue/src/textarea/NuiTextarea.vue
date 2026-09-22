<script setup lang="ts">
import { ref, useTemplateRef, watch } from 'vue';
import { useFieldControl } from '@numior/primitives';
import type { NuiTextareaModifiers, NuiTextareaProps } from './textarea.types';

const {
  id,
  size = 'md',
  disabled = undefined,
  required = undefined,
  invalid = undefined,
  rows = 3,
  resize = 'vertical',
  readonly = false,
} = defineProps<NuiTextareaProps>();
const [model, modifiers] = defineModel<string, NuiTextareaModifiers>({ default: '' });
const { attrs: controlAttrs, invalid: isInvalid } = useFieldControl(() => ({
  id,
  disabled,
  required,
  invalid,
}));
const textareaElement = useTemplateRef<HTMLTextAreaElement>('textarea');
const draft = ref(model.value);

watch(model, (value) => {
  if (!(modifiers.trim && draft.value.trim() === value)) draft.value = value;
});

function onInput(): void {
  const element = textareaElement.value;
  if (!element) return;
  draft.value = element.value;
  if (!modifiers.lazy) model.value = element.value;
}

function onChange(): void {
  const element = textareaElement.value;
  if (!element) return;
  if (modifiers.trim) element.value = element.value.trim();
  draft.value = element.value;
  model.value = element.value;
}

defineExpose({ focus: () => textareaElement.value?.focus() });
</script>

<template>
  <textarea
    ref="textarea"
    class="nui-textarea"
    :class="[
      `nui-textarea--size-${size}`,
      `nui-textarea--resize-${resize}`,
      { 'nui-textarea--invalid': isInvalid },
    ]"
    v-bind="controlAttrs"
    :rows="rows"
    :readonly="readonly || undefined"
    :value="draft"
    @input="onInput"
    @change="onChange"
  />
</template>
