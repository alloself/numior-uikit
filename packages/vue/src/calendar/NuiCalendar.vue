<template>
  <div
    :id="baseId"
    ref="root"
    class="nui-calendar"
    :class="[
      `nui-calendar--size-${size}`,
      `nui-calendar--mode-${mode}`,
      `nui-calendar--view-${calendarView.view.value}`,
      {
        'nui-calendar--week-numbers': weekNumbers,
        'nui-calendar--multi': calendarView.visibleMonths.value.length > 1,
        'nui-calendar--picking': selection.picking.value,
        'nui-calendar--presets': presetList.length > 0,
        'nui-calendar--disabled': disabled,
      },
    ]"
    :inert="disabled || undefined"
    @pointerup="onPointerup"
    @pointerleave="selection.hovered.value = undefined"
  >
    <aside v-if="presetList.length > 0" class="nui-calendar__presets">
      <NuiButton
        v-for="preset in presetList"
        :key="preset.label"
        variant="ghost"
        tone="neutral"
        size="sm"
        class="nui-calendar__preset"
        :aria-pressed="selection.isPresetActive(preset)"
        @click="applyPreset(preset)"
      >
        {{ preset.label }}
      </NuiButton>
    </aside>
    <div class="nui-calendar__months">
      <NuiCalendarMonth
        v-for="(key, index) in calendarView.visibleMonths.value"
        :key="index"
        :month="key"
        :first="index === 0"
        :last="index === calendarView.visibleMonths.value.length - 1"
      />
    </div>
    <div v-if="showToday || $slots.actions" class="nui-calendar__footer">
      <NuiButton
        v-if="showToday && todayDate"
        variant="ghost"
        tone="neutral"
        size="sm"
        class="nui-calendar__today"
        @click="goToday"
      >
        {{ todayText }}
      </NuiButton>
      <div v-if="$slots.actions" class="nui-calendar__actions"><slot name="actions" /></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
import {
  addMonthKeys,
  clampIsoDate,
  compareIsoDates,
  daysInMonth,
  formatIsoDate,
  isWithin,
  localToday,
  monthKeyOf,
  useControlId,
  useDirection,
  useLocale,
  useMessages,
  weekStartOf,
} from '@numior/primitives';
import NuiButton from '../button/NuiButton.vue';
import NuiCalendarMonth from './NuiCalendarMonth.vue';
import { provideCalendar, type RequestOptions } from './calendar-context';
import { calendarMessages } from './calendar.messages';
import type { NuiCalendarProps, NuiCalendarValue, NuiDatePreset } from './calendar.types';
import { dayStateOf, sameCalendarValue, selectedDatesOf } from './day-state';
import { useCalendarSelection } from './use-calendar-selection';
import { useCalendarView } from './use-calendar-view';

defineSlots<{ actions(): unknown }>();

const {
  id,
  mode = 'single',
  locale: localeProp,
  weekStart: weekStartProp,
  min,
  max,
  isDateDisabled,
  months = 1,
  weekNumbers = false,
  fixedWeeks = true,
  showOutsideDays = true,
  showToday = true,
  today,
  presets,
  size = 'md',
  disabled = false,
  previousLabel,
  nextLabel,
  monthLabel,
  yearLabel,
  todayLabel,
  weekLabel,
} = defineProps<NuiCalendarProps>();

const model = defineModel<NuiCalendarValue>({ default: null });
const monthModel = defineModel<string | undefined>('month');

const baseId = useControlId(() => id);
const root = useTemplateRef<HTMLElement>('root');
const locale = useLocale(() => localeProp);
const messages = useMessages(calendarMessages, locale);

const todayText = computed(() => todayLabel ?? messages.value.today);
const weekStart = computed(() => weekStartProp ?? weekStartOf(locale.value));
const mounted = ref(false);
const todayDate = computed(() => today ?? (mounted.value ? localToday() : undefined));
const presetList = computed(() => (mode === 'range' ? (presets ?? []) : []));

const initialDate = (): string =>
  clampIsoDate(selectedDatesOf(model.value)[0] ?? today ?? localToday(), min, max);

const calendarView = useCalendarView({
  month: monthModel,
  initial: monthKeyOf(initialDate()),
  months: () => months,
});

const selection = useCalendarSelection({
  model,
  mode: () => mode,
  today: () => todayDate.value,
});

const focused = ref(initialDate());
const focusRequests = ref(0);
const focusState = { pending: false, take: false };
const picks: { last: NuiCalendarValue } = { last: model.value };

const isDisabled = (date: string): boolean =>
  !isWithin(date, min, max) || (isDateDisabled?.(date) ?? false);

const { isRtl } = useDirection(root);

const reveal = (key: string): void => {
  const { visibleMonths, month, setMonth } = calendarView;

  if (visibleMonths.value.includes(key)) {
    return;
  }

  const before = compareIsoDates(`${key}-01`, `${month.value}-01`) < 0;

  setMonth(before ? key : addMonthKeys(key, 1 - visibleMonths.value.length));
};

const request = (date: string, options: RequestOptions = {}): void => {
  const target = clampIsoDate(date, min, max);

  reveal(monthKeyOf(target));
  focused.value = target;
  focusState.pending = options.focus ?? true;
  focusState.take = options.take ?? false;

  if (focusState.pending) {
    focusRequests.value += 1;
  }
};

const holdsFocus = (): boolean => {
  const active = document.activeElement;

  return active === null || active === document.body || root.value?.contains(active) === true;
};

const settle = (): void => {
  if (!focusState.pending || calendarView.view.value !== 'days') {
    return;
  }

  if (!focusState.take && !holdsFocus()) {
    focusState.pending = false;

    return;
  }

  const button = root.value?.querySelector(`time[datetime="${focused.value}"]`)?.closest('button');

  if (button instanceof HTMLButtonElement) {
    focusState.pending = false;
    button.focus({ preventScroll: true });
  }
};

const remember = (value: NuiCalendarValue | undefined): void => {
  if (value !== undefined) {
    picks.last = value;
  }
};

const pick = (date: string): void => {
  remember(selection.pick(date));
  request(date);
};

const click = (date: string): void => {
  remember(selection.click(date));
  request(date);
};

const pickMonth = (key: string): void => {
  const day = Number(focused.value.slice(8, 10));
  const year = Number(key.slice(0, 4));
  const monthNumber = Number(key.slice(5, 7));

  calendarView.setView('days');

  request(
    formatIsoDate({ year, month: monthNumber, day: Math.min(day, daysInMonth(year, monthNumber)) }),
  );
};

const pickYear = (year: number): void => {
  calendarView.setMonth(`${String(year).padStart(4, '0')}-${calendarView.month.value.slice(5, 7)}`);
  calendarView.setView('months');
};

const goToday = (): void => {
  if (!todayDate.value) {
    return;
  }

  if (mode === 'single' && !isDisabled(todayDate.value)) {
    pick(todayDate.value);
  } else {
    calendarView.setView('days');
    request(todayDate.value);
  }
};

const onPointerup = (event: PointerEvent): void => {
  if (!(event.target instanceof Element && event.target.closest('.nui-calendar__day'))) {
    selection.clearArm();
  }
};

const applyPreset = (preset: NuiDatePreset): void => {
  const range = selection.resolvePreset(preset);

  if (!range) {
    return;
  }

  model.value = range;
  picks.last = range;

  if (range.start) {
    request(range.start, { focus: false });
  }
};

provideCalendar({
  id: baseId,
  locale,
  weekStart,
  mode: () => mode,
  weekNumbers: () => weekNumbers,
  fixedWeeks: () => fixedWeeks,
  showOutsideDays: () => showOutsideDays,
  labels: () => ({
    previous: previousLabel ?? messages.value.previous,
    next: nextLabel ?? messages.value.next,
    month: monthLabel ?? messages.value.month,
    year: yearLabel ?? messages.value.year,
    week: weekLabel ?? messages.value.week,
  }),
  ...calendarView,
  focused,
  isRtl,
  isDisabled,
  dayState: (date, key) =>
    dayStateOf(date, key, {
      today: todayDate.value,
      disabled: isDisabled(date),
      selected: selection.selected.value,
      range: selection.range.value,
      preview: selection.preview.value,
    }),
  pickMonth,
  pickYear,
  request,
  click,
  hover: (date) => {
    selection.hovered.value = date;
  },
  arm: (date) => remember(selection.arm(date)),
  release: (date) => remember(selection.release(date)),
});

onMounted(() => {
  mounted.value = true;
  watch([focusRequests, calendarView.month, calendarView.view], settle, { flush: 'post' });

  watch(model, (value) => {
    if (sameCalendarValue(value, picks.last)) {
      return;
    }

    picks.last = value;
    const first = selectedDatesOf(value)[0];

    if (first) {
      request(first, { focus: false });
    }
  });
});

defineExpose({ focus: (date?: string) => request(date ?? focused.value, { take: true }) });
</script>
