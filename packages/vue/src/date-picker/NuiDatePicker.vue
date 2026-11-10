<template>
  <NuiFieldFrame v-bind="fieldFrame" :reserve-error="reserveError">
    <NuiDateField
      ref="frame"
      :popover="popover"
      :size="size"
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
        :model-value="model"
        :locale="locale"
        :min="min"
        :max="max"
        :is-date-disabled="isDateDisabled"
        :time="time"
        :placeholder="placeholder"
        v-bind="{ ...controlAttrs, ...split.controlAttrs() }"
        @update:model-value="setValue"
        @keydown="onInputKeydown"
        @click="onInputClick"
      />
      <template #panel>
        <NuiCalendar
          ref="calendar"
          v-model:month="month"
          :model-value="dateValue"
          :locale="locale"
          :week-start="weekStart"
          :min="min"
          :max="max"
          :is-date-disabled="isDateDisabled"
          :week-numbers="weekNumbers"
          :months="months"
          :today="today"
          :today-label="todayLabel"
          :previous-label="previousLabel"
          :next-label="nextLabel"
          :month-label="monthLabel"
          :year-label="yearLabel"
          :week-label="weekLabel"
          @update:model-value="pickDate"
        >
          <template v-if="$slots.actions" #actions><slot name="actions" /></template>
        </NuiCalendar>
        <NuiTimeField
          v-if="time"
          class="nui-date-picker__time"
          :model-value="timeValue"
          :locale="locale"
          :step="timeStep"
          :clock-label="timeLabel"
          size="sm"
          @update:model-value="pickTime"
          @keydown="onTimeKeydown"
        />
      </template>
      <input v-if="name" type="hidden" :name="name" :value="model ?? ''" :disabled="isDisabled" />
    </NuiDateField>
  </NuiFieldFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { FloatingPlacement, joinDateTime, Key, splitDateTime } from '@numior/primitives';
import NuiFieldFrame from '../field/NuiFieldFrame.vue';
import NuiCalendar from '../calendar/NuiCalendar.vue';
import type { NuiCalendarValue } from '../calendar/calendar.types';
import NuiTimeField from '../time-field/NuiTimeField.vue';
import NuiDateField from './NuiDateField.vue';
import NuiDateInput from './NuiDateInput.vue';
import type { NuiDatePickerProps } from './date-picker.types';
import { useDatePickerShell } from './use-date-picker-shell';
import { NuiSize } from '../shared/scale.types';

defineOptions({ inheritAttrs: false });
defineSlots<{ actions(): unknown }>();

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
  months = 1,
  today,
  clearable = false,
  openOnClick = false,
  readonly = undefined,
  placement = FloatingPlacement.BottomStart,
  placeholder,
  name,
  time = false,
  timeStep = 15,
  timeLabel,
  openLabel,
  clearLabel,
  dialogLabel,
  todayLabel,
  previousLabel,
  nextLabel,
  monthLabel,
  yearLabel,
  weekLabel,
} = defineProps<NuiDatePickerProps>();

const model = defineModel<string | null>({ default: null });

const dateValue = computed(() => (time ? (splitDateTime(model.value)?.date ?? null) : model.value));
const timeValue = computed(() => splitDateTime(model.value)?.time ?? null);

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
  focusDate: () => dateValue.value,
});

const texts = computed(() => ({
  open: openLabel ?? messages.value.open,
  clear: clearLabel ?? messages.value.clear,
  dialog: dialogLabel ?? messages.value.dialog,
}));

const showClear = computed(
  () => clearable && model.value !== null && !isDisabled.value && !isReadonly.value,
);

const setValue = (value: string | null): void => {
  model.value = value;
};

const pickDate = (value: NuiCalendarValue): void => {
  if (typeof value !== 'string') {
    return;
  }

  if (time) {
    model.value = joinDateTime(value, timeValue.value ?? '00:00');

    return;
  }

  model.value = value;
  popover.hide({ focus: true });
};

const pickTime = (value: string | null): void => {
  if (value !== null && dateValue.value !== null) {
    model.value = joinDateTime(dateValue.value, value);
  }
};

const clear = (): void => {
  model.value = null;
  focusInput();
};

const onTimeKeydown = (event: KeyboardEvent): void => {
  if (event.key !== Key.Enter || event.defaultPrevented) {
    return;
  }

  event.preventDefault();
  popover.hide({ focus: true });
};

defineExpose(exposed);
</script>
