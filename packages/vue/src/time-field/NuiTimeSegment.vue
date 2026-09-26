<template>
  <input
    ref="input"
    class="nui-time-field__segment"
    :class="`nui-time-field__segment--type-${type}`"
    type="text"
    autocomplete="off"
    spellcheck="false"
    role="spinbutton"
    :inputmode="type === 'dayPeriod' ? 'text' : 'numeric'"
    :enterkeyhint="last ? 'done' : 'next'"
    placeholder="--"
    :id="id"
    :tabindex="tabStop ? 0 : -1"
    :aria-label="label"
    :aria-valuenow="value ?? undefined"
    :aria-valuemin="min"
    :aria-valuemax="max"
    :aria-valuetext="valueText"
    :aria-invalid="invalid ? 'true' : undefined"
    :aria-required="required || undefined"
    :disabled="disabled"
    :readonly="readonly || undefined"
    :value="text"
    @beforeinput="onBeforeinput"
    @input="onInput"
    @keydown="onKeydown"
    @focus="select"
  />
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue';
import type { NuiTimeSegmentProps } from './time-field.types';

type SegmentAction = 'step-up' | 'step-down' | 'min' | 'max' | 'clear';

const SEGMENT_KEYS: Record<string, SegmentAction> = {
  ArrowUp: 'step-up',
  ArrowDown: 'step-down',
  Home: 'min',
  End: 'max',
  Backspace: 'clear',
  Delete: 'clear',
};

const {
  type,
  text,
  label,
  value,
  min,
  max,
  valueText,
  id,
  tabStop,
  last = false,
  disabled,
  readonly,
  invalid,
  required,
} = defineProps<NuiTimeSegmentProps>();

const emit = defineEmits<{
  char: [char: string];
  step: [delta: 1 | -1];
  edge: [edge: 'min' | 'max'];
  clear: [];
}>();

const inputElement = useTemplateRef<HTMLInputElement>('input');

const feed = (chars: string): void => {
  for (const char of chars) {
    emit('char', char);
  }
};

const onBeforeinput = (event: InputEvent): void => {
  if (!event.inputType.startsWith('insert') || event.inputType.includes('Composition')) {
    return;
  }
  event.preventDefault();
  if (event.data) {
    feed(event.data);
  }
};

const onInput = (): void => {
  const element = inputElement.value;
  if (!element || element.value === text) {
    return;
  }
  const extra = element.value.startsWith(text) ? element.value.slice(text.length) : element.value;
  element.value = text;
  feed(extra);
};

const onKeydown = (event: KeyboardEvent): void => {
  const action = SEGMENT_KEYS[event.key];
  if (action === undefined || readonly || event.altKey) {
    return;
  }
  event.preventDefault();

  switch (action) {
    case 'step-up':
      emit('step', 1);
      break;
    case 'step-down':
      emit('step', -1);
      break;
    case 'clear':
      emit('clear');
      break;
    case 'min':
    case 'max':
      emit('edge', action);
      break;
  }
};

const select = (): void => inputElement.value?.select();
</script>
