<template>
  <input
    ref="input"
    class="nui-time-field__segment"
    :class="`nui-time-field__segment--type-${type}`"
    type="text"
    autocomplete="off"
    spellcheck="false"
    role="spinbutton"
    :inputmode="type === TimeSegmentType.DayPeriod ? 'text' : 'numeric'"
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
import { Key, TimeSegmentType } from '@numior/primitives';
import { SegmentAction, type NuiTimeSegmentProps, type TimeEdge } from './time-field.types';

const SEGMENT_KEYS: Record<string, SegmentAction> = {
  [Key.ArrowUp]: SegmentAction.StepUp,
  [Key.ArrowDown]: SegmentAction.StepDown,
  [Key.Home]: SegmentAction.Min,
  [Key.End]: SegmentAction.Max,
  [Key.Backspace]: SegmentAction.Clear,
  [Key.Delete]: SegmentAction.Clear,
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
  edge: [edge: TimeEdge];
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
  if (!event.data) {
    return;
  }

  feed(event.data);
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
    case SegmentAction.StepUp:
      emit('step', 1);
      break;
    case SegmentAction.StepDown:
      emit('step', -1);
      break;
    case SegmentAction.Clear:
      emit('clear');
      break;
    case SegmentAction.Min:
    case SegmentAction.Max:
      emit('edge', action);
      break;
  }
};

const select = (): void => inputElement.value?.select();
</script>
