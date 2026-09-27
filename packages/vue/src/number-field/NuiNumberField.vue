<template>
  <NuiFieldFrame v-bind="fieldFrame" :reserve-error="reserveError">
    <div
      class="nui-number-field"
      :class="[
        `nui-number-field--size-${size}`,
        {
          'nui-number-field--invalid': isInvalid,
          'nui-number-field--disabled': isDisabled,
          'nui-number-field--readonly': readonly,
          'nui-number-field--steppers': steppers,
        },
      ]"
      v-bind="split.rootAttrs()"
    >
      <span v-if="$slots.prefix" class="nui-number-field__prefix">
        <slot name="prefix" />
      </span>
      <input
        ref="input"
        class="nui-number-field__control"
        type="text"
        role="spinbutton"
        inputmode="decimal"
        autocomplete="off"
        v-bind="{ ...controlAttrs, ...split.controlAttrs() }"
        :aria-valuenow="model ?? undefined"
        :aria-valuemin="min"
        :aria-valuemax="max"
        :aria-valuetext="valueText || undefined"
        :readonly="readonly || undefined"
        :value="draft"
        @beforeinput="onBeforeinput"
        @input="onInput"
        @keydown="onKeydown"
        @blur="commit"
      />
      <span v-if="$slots.suffix" class="nui-number-field__suffix">
        <slot name="suffix" />
      </span>
      <span v-if="steppers" class="nui-number-field__steppers" aria-hidden="true">
        <NuiButton
          variant="ghost"
          tone="neutral"
          size="sm"
          icon-only
          class="nui-number-field__stepper nui-number-field__stepper--down"
          tabindex="-1"
          :aria-label="decrementText"
          :disabled="!canDecrement"
          @pointerdown.prevent
          @click="stepBy(-1)"
        >
          <NuiIcon alias="minus" />
        </NuiButton>
        <NuiButton
          variant="ghost"
          tone="neutral"
          size="sm"
          icon-only
          class="nui-number-field__stepper nui-number-field__stepper--up"
          tabindex="-1"
          :aria-label="incrementText"
          :disabled="!canIncrement"
          @pointerdown.prevent
          @click="stepBy(1)"
        >
          <NuiIcon alias="plus" />
        </NuiButton>
      </span>
      <input v-if="name" type="hidden" :name="name" :value="model ?? ''" />
    </div>
  </NuiFieldFrame>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue';
import {
  clampNumber,
  formatNumber,
  isPartialNumber,
  numberSymbols,
  parseNumber,
  stepNumber,
  useFieldControl,
  useLocale,
  useMessages,
  useSplitAttrs,
  withStepPrecision,
} from '@numior/primitives';
import NuiFieldFrame from '../field/NuiFieldFrame';
import NuiButton from '../button/NuiButton.vue';
import NuiIcon from '../icon/NuiIcon.vue';
import { numberFieldMessages } from './number-field.messages';
import type { NuiNumberFieldProps } from './number-field.types';

const KEY_STEPS: Record<string, number> = { ArrowUp: 1, ArrowDown: -1, PageUp: 10, PageDown: -10 };

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
  min,
  max,
  step = 1,
  formatOptions,
  locale: localeProp,
  readonly = false,
  steppers = true,
  name,
  incrementLabel,
  decrementLabel,
} = defineProps<NuiNumberFieldProps>();

const model = defineModel<number | null>({ default: null });
const split = useSplitAttrs();

const {
  frame: fieldFrame,
  attrs: controlAttrs,
  invalid: isInvalid,
  disabled: isDisabled,
} = useFieldControl(() => ({ id, disabled, required, invalid, label, description, error }), {
  commit: () => commit(),
});

const inputElement = useTemplateRef<HTMLInputElement>('input');
const locale = useLocale(() => localeProp);
const messages = useMessages(numberFieldMessages, locale);

const incrementText = computed(() => incrementLabel ?? messages.value.increment);
const decrementText = computed(() => decrementLabel ?? messages.value.decrement);
const options = computed(() => withStepPrecision(formatOptions, step));
const symbols = computed(() => numberSymbols(locale.value, options.value));
const format = (value: number | null): string => formatNumber(value, locale.value, options.value);
const parse = (text: string): number | null => parseNumber(text, locale.value, options.value);
const draft = ref(format(model.value));
const valueText = computed(() => format(model.value));

const canIncrement = computed(
  () =>
    !isDisabled.value &&
    !readonly &&
    (max === undefined || model.value === null || model.value < max),
);

const canDecrement = computed(
  () =>
    !isDisabled.value &&
    !readonly &&
    (min === undefined || model.value === null || model.value > min),
);

watch(model, (value) => {
  if (parse(draft.value) !== value) {
    draft.value = format(value);
  }
});

watch([locale, options], () => {
  draft.value = format(model.value);
});

const apply = (value: number | null): void => {
  model.value = value;
  draft.value = format(value);
};

const commit = (): void => {
  const parsed = parse(draft.value);
  if (parsed === null) {
    apply(null);
    return;
  }
  const clamped = clampNumber(parsed, min, max);
  const text = format(clamped);
  model.value = parse(text) ?? clamped;
  draft.value = text;
};

const stepBy = (steps: number): void => {
  if (isDisabled.value || readonly) {
    return;
  }
  apply(stepNumber(parse(draft.value), steps, { step, min, max }));
};

const onInput = (): void => {
  const element = inputElement.value;
  if (element) {
    draft.value = element.value;
  }
};

const onBeforeinput = (event: InputEvent): void => {
  const inserting =
    event.inputType.startsWith('insert') && !event.inputType.includes('Composition');

  if (inserting && event.data !== null && !isPartialNumber(event.data, symbols.value)) {
    event.preventDefault();
  }
};

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Enter') {
    commit();
    return;
  }
  if (event.key === 'Home' && min !== undefined) {
    event.preventDefault();
    apply(min);
    return;
  }
  if (event.key === 'End' && max !== undefined) {
    event.preventDefault();
    apply(max);
    return;
  }
  const steps = KEY_STEPS[event.key];
  if (steps === undefined) {
    return;
  }
  event.preventDefault();
  stepBy(event.shiftKey && Math.abs(steps) === 1 ? steps * 10 : steps);
};

defineExpose({ focus: () => inputElement.value?.focus() });
</script>
