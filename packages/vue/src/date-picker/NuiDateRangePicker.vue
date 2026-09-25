<template>
  <NuiDateField
    ref="frame"
    :popover="popover"
    :size="size"
    range
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
      :model-value="model.start"
      :locale="locale"
      :placeholder="startPlaceholder"
      :readonly="readonly"
      v-bind="{ ...controlAttrs, ...split.controlAttrs() }"
      @update:model-value="setStart"
      @keydown="onInputKeydown"
    />
    <span class="nui-date-picker__separator" aria-hidden="true">–</span>
    <NuiDateInput
      :model-value="model.end"
      :locale="locale"
      :placeholder="endPlaceholder"
      :readonly="readonly"
      :disabled="isDisabled"
      :label="endLabel"
      :aria-describedby="controlAttrs['aria-describedby']"
      :aria-invalid="controlAttrs['aria-invalid']"
      @update:model-value="setEnd"
      @keydown="onInputKeydown"
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
    <input v-if="startName" type="hidden" :name="startName" :value="model.start ?? ''" />
    <input v-if="endName" type="hidden" :name="endName" :value="model.end ?? ''" />
  </NuiDateField>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
import {
  normalizeRange,
  useField,
  useFieldControl,
  useLocale,
  useSplitAttrs,
} from '@numior/primitives';
import NuiCalendar from '../calendar/NuiCalendar.vue';
import type { NuiCalendarValue, NuiDateRange } from '../calendar/calendar.types';
import { isDateRange } from '../calendar/day-state';
import NuiDateField from './NuiDateField.vue';
import NuiDateInput from './NuiDateInput.vue';
import type { NuiDateRangePickerProps } from './date-picker.types';
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
  months = 2,
  today,
  clearable = false,
  readonly = false,
  placement = 'bottom-start',
  startPlaceholder,
  endPlaceholder,
  startName,
  endName,
  endLabel = 'End date',
  presets,
  openLabel = 'Choose dates',
  clearLabel = 'Clear',
  dialogLabel = 'Calendar',
  todayLabel = 'Today',
  previousLabel = 'Previous month',
  nextLabel = 'Next month',
  monthLabel = 'Choose month',
  yearLabel = 'Choose year',
  weekLabel = 'Week',
} = defineProps<NuiDateRangePickerProps>();

const model = defineModel<NuiDateRange>({ default: () => ({ start: null, end: null }) });

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
  () =>
    clearable &&
    (model.value.start !== null || model.value.end !== null) &&
    !isDisabled.value &&
    !readonly,
);

const popover = usePickerPopover({
  anchor: () => frame.value?.root ?? null,
  id: panelId,
  placement: () => placement,
  returnFocus: () => input.value?.focus(),
});

const setStart = (date: string | null): void => {
  model.value = normalizeRange({ start: date, end: model.value.end });
};

const setEnd = (date: string | null): void => {
  model.value = normalizeRange({ start: model.value.start, end: date });
};

const pickRange = (value: NuiCalendarValue): void => {
  if (!isDateRange(value)) {
    return;
  }

  model.value = value;

  if (value.start && value.end) {
    popover.hide({ focus: true });
  }
};

const clear = (): void => {
  model.value = { start: null, end: null };
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

onMounted(() => {
  watch(
    popover.open,
    (isOpen) => {
      if (isOpen) {
        calendar.value?.focus(model.value.start ?? undefined);
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
