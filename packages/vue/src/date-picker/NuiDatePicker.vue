<template>
  <div
    ref="root"
    class="nui-date-picker"
    :class="[
      `nui-date-picker--size-${size}`,
      {
        'nui-date-picker--open': popover.open.value,
        'nui-date-picker--invalid': isInvalid,
        'nui-date-picker--disabled': isDisabled,
        'nui-date-picker--readonly': readonly,
        'nui-date-picker--clearable': showClear,
      },
    ]"
    v-bind="split.rootAttrs()"
    @focusout="popover.onFocusout"
  >
    <NuiDateInput
      ref="input"
      :model-value="model"
      :locale="locale"
      :placeholder="placeholder"
      :readonly="readonly"
      v-bind="{ ...controlAttrs, ...split.controlAttrs() }"
      @update:model-value="setDate"
      @keydown="onInputKeydown"
    />
    <NuiButton
      v-if="showClear"
      variant="ghost"
      tone="neutral"
      size="sm"
      icon-only
      class="nui-date-picker__clear"
      :aria-label="clearLabel"
      tabindex="-1"
      @click="clear"
    >
      <NuiIcon alias="x" />
    </NuiButton>
    <NuiButton
      variant="ghost"
      tone="neutral"
      size="sm"
      icon-only
      class="nui-date-picker__open"
      :aria-label="openLabel"
      aria-haspopup="dialog"
      :aria-expanded="popover.open.value ? 'true' : 'false'"
      :aria-controls="panelId"
      :disabled="isDisabled || readonly"
      @click="popover.toggle"
    >
      <NuiIcon alias="calendar" />
    </NuiButton>
    <div
      :ref="popover.setPanel"
      class="nui-date-picker__panel"
      role="dialog"
      aria-modal="false"
      :aria-label="field?.labelledBy.value ? undefined : dialogLabel"
      :aria-labelledby="field?.labelledBy.value"
      :style="popover.floatingStyles.value"
      v-bind="popover.control.contentAttrs.value"
      @keydown="onPanelKeydown"
    >
      <NuiCalendar
        ref="calendar"
        v-model:month="month"
        :model-value="model"
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
    </div>
    <input v-if="name" type="hidden" :name="name" :value="model ?? ''" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
import { useField, useFieldControl, useLocale, useSplitAttrs } from '@numior/primitives';
import NuiButton from '../button/NuiButton.vue';
import NuiCalendar from '../calendar/NuiCalendar.vue';
import type { NuiCalendarValue } from '../calendar/calendar.types';
import NuiIcon from '../icon/NuiIcon.vue';
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
const root = useTemplateRef<HTMLElement>('root');
const input = useTemplateRef<{ focus: () => void }>('input');
const calendar = useTemplateRef<{ focus: (date?: string) => void }>('calendar');
const month = ref<string>();
const panelId = computed(() => `${controlAttrs.value.id}-panel`);

const showClear = computed(
  () => clearable && model.value !== null && !isDisabled.value && !readonly,
);

const popover = usePickerPopover({
  anchor: root,
  id: panelId,
  placement: () => placement,
  returnFocus: () => input.value?.focus(),
});

const setDate = (date: string | null): void => {
  model.value = date;
};

const pickDate = (value: NuiCalendarValue): void => {
  if (typeof value === 'string') {
    model.value = value;
    popover.hide({ focus: true });
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

const onPanelKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape' && !event.defaultPrevented) {
    event.preventDefault();
    popover.hide({ focus: true });
  }
};

onMounted(() => {
  watch(
    popover.open,
    (isOpen) => {
      if (isOpen) {
        calendar.value?.focus(model.value ?? undefined);
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
