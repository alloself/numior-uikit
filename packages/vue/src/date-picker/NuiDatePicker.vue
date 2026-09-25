<template>
  <NuiDateField
    ref="frame"
    :popover="popover"
    :size="size"
    :invalid="isInvalid"
    :disabled="isDisabled"
    :readonly="readonly"
    :clearable="showClear"
    :open-label="openLabel"
    :clear-label="clearLabel"
    :dialog-label="dialogLabel"
    :labelled-by="field?.labelledBy.value"
    v-bind="split.rootAttrs()"
    @clear="clear"
  >
    <NuiDateInput
      ref="input"
      :model-value="model"
      :locale="locale"
      :time="time"
      :placeholder="placeholder"
      :readonly="readonly"
      v-bind="{ ...controlAttrs, ...split.controlAttrs() }"
      @update:model-value="setValue"
      @keydown="onInputKeydown"
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
    <input v-if="name" type="hidden" :name="name" :value="model ?? ''" />
  </NuiDateField>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
import {
  joinDateTime,
  splitDateTime,
  useField,
  useFieldControl,
  useLocale,
  useSplitAttrs,
} from '@numior/primitives';
import NuiCalendar from '../calendar/NuiCalendar.vue';
import type { NuiCalendarValue } from '../calendar/calendar.types';
import NuiTimeField from '../time-field/NuiTimeField.vue';
import NuiDateField from './NuiDateField.vue';
import NuiDateInput from './NuiDateInput.vue';
import type { NuiDatePickerProps } from './date-picker.types';
import { usePickerPopover } from './use-picker-popover';

defineOptions({ inheritAttrs: false });
defineSlots<{ actions(): unknown }>();

const {
  id,
  size = 'md',
  disabled = undefined,
  required = undefined,
  invalid = undefined,
  locale: localeProp,
  weekStart,
  min,
  max,
  isDateDisabled,
  weekNumbers = false,
  months = 1,
  today,
  clearable = false,
  readonly = false,
  placement = 'bottom-start',
  placeholder,
  name,
  time = false,
  timeStep = 15,
  timeLabel = 'Choose time',
  openLabel = 'Choose date',
  clearLabel = 'Clear',
  dialogLabel = 'Calendar',
  todayLabel = 'Today',
  previousLabel = 'Previous month',
  nextLabel = 'Next month',
  monthLabel = 'Choose month',
  yearLabel = 'Choose year',
  weekLabel = 'Week',
} = defineProps<NuiDatePickerProps>();

const model = defineModel<string | null>({ default: null });

const split = useSplitAttrs();
const field = useField();

const {
  attrs: controlAttrs,
  invalid: isInvalid,
  disabled: isDisabled,
} = useFieldControl(() => ({ id, disabled, required, invalid }));

const locale = useLocale(() => localeProp);
const frame = useTemplateRef<{ root: HTMLElement | null }>('frame');
const input = useTemplateRef<{ focus: () => void }>('input');
const calendar = useTemplateRef<{ focus: (date?: string) => void }>('calendar');
const month = ref<string>();
const panelId = computed(() => `${controlAttrs.value.id}-panel`);

const showClear = computed(
  () => clearable && model.value !== null && !isDisabled.value && !readonly,
);

const dateValue = computed(() => (time ? (splitDateTime(model.value)?.date ?? null) : model.value));
const timeValue = computed(() => splitDateTime(model.value)?.time ?? null);

const popover = usePickerPopover({
  anchor: () => frame.value?.root ?? null,
  id: panelId,
  placement: () => placement,
  returnFocus: () => input.value?.focus(),
});

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
  input.value?.focus();
};

const onInputKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'ArrowDown' && !popover.open.value && !readonly && !isDisabled.value) {
    event.preventDefault();
    popover.show();
  } else if (event.key === 'Escape' && popover.open.value) {
    event.preventDefault();
    popover.hide({ focus: true });
  }
};

const onTimeKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Enter' && !event.defaultPrevented) {
    event.preventDefault();
    popover.hide({ focus: true });
  }
};

onMounted(() => {
  watch(
    popover.open,
    (isOpen) => {
      if (isOpen) {
        calendar.value?.focus(dateValue.value ?? undefined);
      }
    },
    { flush: 'post' },
  );
});

defineExpose({
  focus: () => input.value?.focus(),
  open: () => popover.show(),
  close: () => popover.hide(),
});
</script>
