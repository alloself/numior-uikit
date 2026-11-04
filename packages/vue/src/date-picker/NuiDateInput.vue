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
    @beforeinput="onBeforeinput"
    @input="onInput"
    @compositionend="onCompositionend"
    @change="text.settle"
    @blur="text.settle"
  />
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import {
  dateMaskOf,
  datePatternOf,
  DateTimePart,
  InputType,
  isWithin,
  maskDateText,
  typeIntoDateText,
  useMessages,
  type MaskedDateText,
} from '@numior/primitives';
import { datePickerMessages } from './date-picker.messages';
import type { NuiDateInputProps } from './date-picker.types';
import { useDateText } from './use-date-text';

const WHOLE_INPUTS: ReadonlySet<string> = new Set([
  InputType.InsertFromPaste,
  InputType.InsertFromDrop,
  InputType.InsertReplacementText,
]);

const {
  modelValue,
  locale,
  min,
  max,
  isDateDisabled,
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
  accepts: (date) => isWithin(date, min, max) && !(isDateDisabled?.(date) ?? false),
  commit: (date) => emit('update:modelValue', date),
});

const pattern = computed(() => {
  const glyphs = {
    year: messages.value.yearGlyph,
    month: messages.value.monthGlyph,
    day: messages.value.dayGlyph,
  };

  const date = datePatternOf(locale)
    .map((part) =>
      part.type === DateTimePart.Literal ? part.text : glyphs[part.type].repeat(part.length),
    )
    .join('');

  return time ? `${date} ${messages.value.timeGlyphs}` : date;
});

const parts = computed(() => dateMaskOf(locale, time));

const apply = (element: HTMLInputElement, masked: MaskedDateText): void => {
  if (element.value !== masked.text) {
    element.value = masked.text;
  }
  if (element.ownerDocument.activeElement === element) {
    element.setSelectionRange(masked.caret, masked.caret);
  }
  text.input(masked.text);
};

const caretOf = (element: HTMLInputElement): number =>
  element.selectionStart ?? element.value.length;

const settleRaw = (element: HTMLInputElement, eager: boolean): void => {
  apply(element, maskDateText(element.value, caretOf(element), parts.value, eager));
};

const onBeforeinput = (event: InputEvent): void => {
  const element = inputElement.value;

  if (
    !element ||
    event.isComposing ||
    event.inputType !== InputType.InsertText ||
    event.data === null ||
    element.selectionStart !== element.selectionEnd
  ) {
    return;
  }
  event.preventDefault();
  apply(element, typeIntoDateText(element.value, caretOf(element), event.data, parts.value));
};

const isWhole = (event: Event): boolean =>
  !(event instanceof InputEvent) || WHOLE_INPUTS.has(event.inputType);

const onInput = (event: Event): void => {
  const element = inputElement.value;

  if (!element || (event instanceof InputEvent && event.isComposing)) {
    return;
  }
  const tidy = isWhole(event) ? text.tidy(element.value) : undefined;

  if (tidy !== undefined) {
    apply(element, { text: tidy, caret: tidy.length });
    return;
  }
  settleRaw(element, !(event instanceof InputEvent && event.inputType.startsWith('delete')));
};

const onCompositionend = (): void => {
  const element = inputElement.value;

  if (element) {
    settleRaw(element, true);
  }
};

defineExpose({ focus: () => inputElement.value?.focus({ preventScroll: true }) });
</script>
