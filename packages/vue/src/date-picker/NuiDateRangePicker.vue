<template>
  <NuiFieldFrame v-bind="fieldFrame" :reserve-error="reserveError">
    <NuiDateField
      ref="frame"
      :popover="popover"
      :size="size"
      range
      :invalid="isInvalid"
      :disabled="isDisabled"
      :readonly="isReadonly"
      :clearable="showClear"
      :open-label="texts.open"
      :clear-label="texts.clear"
      :dialog-label="texts.dialog"
      :labelled-by="field?.labelledBy.value"
      v-bind="split.rootAttrs()"
      @clear="clear"
    >
      <NuiDateInput
        ref="input"
        :model-value="model.start"
        :locale="locale"
        :min="min"
        :max="max"
        :is-date-disabled="isDateDisabled"
        :placeholder="startPlaceholder"
        v-bind="{ ...controlAttrs, ...split.controlAttrs() }"
        @update:model-value="setEnd(DateRangeEnd.Start, $event)"
        @settle="settleEnd(DateRangeEnd.Start)"
        @keydown="onInputKeydown"
        @click="onInputClick"
      />
      <span class="nui-date-picker__separator" aria-hidden="true">–</span>
      <NuiDateInput
        :model-value="model.end"
        :locale="locale"
        :min="min"
        :max="max"
        :is-date-disabled="isDateDisabled"
        :placeholder="endPlaceholder"
        :readonly="isReadonly"
        :disabled="isDisabled"
        :label="texts.end"
        :aria-describedby="controlAttrs['aria-describedby']"
        :aria-invalid="controlAttrs['aria-invalid']"
        @update:model-value="setEnd(DateRangeEnd.End, $event)"
        @settle="settleEnd(DateRangeEnd.End)"
        @keydown="onInputKeydown"
        @click="onInputClick"
      />
      <template #panel>
        <NuiCalendar
          ref="calendar"
          v-model:month="month"
          mode="range"
          :model-value="model"
          :locale="locale"
          :week-start="weekStart"
          :min="min"
          :max="max"
          :is-date-disabled="isDateDisabled"
          :week-numbers="weekNumbers"
          :months="months"
          :today="today"
          :presets="presets"
          :today-label="todayLabel"
          :previous-label="previousLabel"
          :next-label="nextLabel"
          :month-label="monthLabel"
          :year-label="yearLabel"
          :week-label="weekLabel"
          @update:model-value="pickRange"
        >
          <template v-if="$slots.actions" #actions><slot name="actions" /></template>
        </NuiCalendar>
      </template>
      <input
        v-if="startName"
        type="hidden"
        :name="startName"
        :value="model.start ?? ''"
        :disabled="isDisabled"
      />
      <input
        v-if="endName"
        type="hidden"
        :name="endName"
        :value="model.end ?? ''"
        :disabled="isDisabled"
      />
    </NuiDateField>
  </NuiFieldFrame>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import { FloatingPlacement, normalizeRange } from '@numior/primitives';
import NuiFieldFrame from '../field/NuiFieldFrame.vue';
import NuiCalendar from '../calendar/NuiCalendar.vue';
import type { NuiCalendarValue, NuiDateRange } from '../calendar/calendar.types';
import { isDateRange } from '../calendar/day-state';
import NuiDateField from './NuiDateField.vue';
import NuiDateInput from './NuiDateInput.vue';
import { DateRangeEnd, type HeldRangeEnd, type NuiDateRangePickerProps } from './date-picker.types';
import { useDatePickerShell } from './use-date-picker-shell';
import { NuiSize } from '../shared/scale.types';

defineOptions({ inheritAttrs: false });
defineSlots<{ actions(): unknown }>();

const isReversed = (range: NuiDateRange): boolean => normalizeRange(range) !== range;

const {
  id,
  size = NuiSize.Md,
  disabled = undefined,
  required = undefined,
  invalid = undefined,
  label,
  description,
  error,
  reserveError = false,
  locale: localeProp,
  weekStart,
  min,
  max,
  isDateDisabled,
  weekNumbers = false,
  months = 2,
  today,
  clearable = false,
  openOnClick = false,
  readonly = undefined,
  placement = FloatingPlacement.BottomStart,
  startPlaceholder,
  endPlaceholder,
  startName,
  endName,
  endLabel,
  presets,
  openLabel,
  clearLabel,
  dialogLabel,
  todayLabel,
  previousLabel,
  nextLabel,
  monthLabel,
  yearLabel,
  weekLabel,
} = defineProps<NuiDateRangePickerProps>();

const model = defineModel<NuiDateRange>({ default: () => ({ start: null, end: null }) });

const held = shallowRef<HeldRangeEnd>();

const {
  split,
  field,
  fieldFrame,
  controlAttrs,
  isInvalid,
  isDisabled,
  isReadonly,
  locale,
  messages,
  month,
  popover,
  exposed,
  focusInput,
  onInputKeydown,
  onInputClick,
} = useDatePickerShell({
  control: () => ({ id, disabled, readonly, required, invalid, label, description, error }),
  locale: () => localeProp,
  placement: () => placement,
  openOnClick: () => openOnClick,
  focusDate: () => model.value.start,
});

const texts = computed(() => ({
  open: openLabel ?? messages.value.openRange,
  clear: clearLabel ?? messages.value.clear,
  dialog: dialogLabel ?? messages.value.dialog,
  end: endLabel ?? messages.value.end,
}));

const showClear = computed(
  () =>
    clearable &&
    (model.value.start !== null || model.value.end !== null) &&
    !isDisabled.value &&
    !isReadonly.value,
);

const withEnd = (end: DateRangeEnd, date: string | null): NuiDateRange => ({
  ...model.value,
  [end]: date,
});

const setEnd = (end: DateRangeEnd, date: string | null): void => {
  const next = withEnd(end, date);

  if (isReversed(next)) {
    held.value = { end, date };
    return;
  }

  held.value = undefined;
  model.value = next;
};

const settleEnd = (end: DateRangeEnd): void => {
  const typed = held.value;

  if (typed?.end !== end) {
    return;
  }

  held.value = undefined;
  model.value = normalizeRange(withEnd(end, typed.date));
};

const pickRange = (value: NuiCalendarValue): void => {
  if (!isDateRange(value)) {
    return;
  }

  held.value = undefined;
  model.value = value;

  if (!value.start || !value.end) {
    return;
  }

  popover.hide({ focus: true });
};

const clear = (): void => {
  held.value = undefined;
  model.value = { start: null, end: null };
  focusInput();
};

defineExpose(exposed);
</script>
