<template>
  <input
    ref="input"
    class="nui-date-picker__input"
    type="text"
    inputmode="numeric"
    autocomplete="off"
    :value="text.draft.value"
    :placeholder="placeholder ?? pattern"
    :disabled="disabled || undefined"
    :readonly="readonly || undefined"
    :aria-label="label"
    @input="onInput"
    @change="text.settle"
    @blur="text.settle"
  />
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { datePatternOf } from '@numior/primitives';
import type { NuiDateInputProps } from './date-picker.types';
import { useDateText } from './use-date-text';

const PLACEHOLDER_GLYPHS = { year: 'Y', month: 'M', day: 'D' };

const {
  modelValue,
  locale,
  placeholder,
  disabled = false,
  readonly = false,
  label,
} = defineProps<NuiDateInputProps>();

const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>();

const inputElement = useTemplateRef<HTMLInputElement>('input');
const localeRef = computed(() => locale);

const text = useDateText({
  value: () => modelValue,
  locale: localeRef,
  commit: (date) => emit('update:modelValue', date),
});

const pattern = computed(() =>
  datePatternOf(locale)
    .map((part) =>
      part.type === 'literal' ? part.text : PLACEHOLDER_GLYPHS[part.type].repeat(part.length),
    )
    .join(''),
);

const onInput = (): void => {
  const element = inputElement.value;

  if (element) {
    text.input(element.value);
  }
};

defineExpose({ focus: () => inputElement.value?.focus({ preventScroll: true }) });
</script>
