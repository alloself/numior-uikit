<template>
  <input
    ref="input"
    class="nui-date-picker__input"
    type="text"
    :inputmode="time ? undefined : 'numeric'"
    autocomplete="off"
    :value="text.draft.value"
    :placeholder="placeholder ?? pattern"
    :size="pattern.length + 2"
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
import { datePatternOf, useMessages } from '@numior/primitives';
import { datePickerMessages } from './date-picker.messages';
import type { NuiDateInputProps } from './date-picker.types';
import { useDateText } from './use-date-text';

const {
  modelValue,
  locale,
  time = false,
  placeholder,
  disabled = false,
  readonly = false,
  label,
} = defineProps<NuiDateInputProps>();

const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>();

const inputElement = useTemplateRef<HTMLInputElement>('input');
const localeRef = computed(() => locale);
const messages = useMessages(datePickerMessages, localeRef);

const text = useDateText({
  value: () => modelValue,
  locale: localeRef,
  time: () => time,
  commit: (date) => emit('update:modelValue', date),
});

const pattern = computed(() => {
  const glyphs = {
    year: messages.value.yearGlyph,
    month: messages.value.monthGlyph,
    day: messages.value.dayGlyph,
  };

  const date = datePatternOf(locale)
    .map((part) => (part.type === 'literal' ? part.text : glyphs[part.type].repeat(part.length)))
    .join('');

  return time ? `${date} ${messages.value.timeGlyphs}` : date;
});

const onInput = (): void => {
  const element = inputElement.value;

  if (element) {
    text.input(element.value);
  }
};

defineExpose({ focus: () => inputElement.value?.focus({ preventScroll: true }) });
</script>
