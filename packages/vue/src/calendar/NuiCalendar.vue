<template>
  <div
    :id="baseId"
    ref="root"
    class="nui-calendar"
    :class="[
      `nui-calendar--size-${size}`,
      `nui-calendar--mode-${mode}`,
      `nui-calendar--view-${view}`,
      {
        'nui-calendar--week-numbers': weekNumbers,
        'nui-calendar--multi': visibleMonths.length > 1,
        'nui-calendar--picking': selection.picking.value,
        'nui-calendar--presets': presetList.length > 0,
        'nui-calendar--disabled': disabled,
      },
    ]"
    :inert="disabled || undefined"
    @pointerup="selection.clearArm"
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
        v-for="(key, index) in visibleMonths"
        :key="index"
        :month="key"
        :first="index === 0"
        :last="index === visibleMonths.length - 1"
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
        {{ todayLabel }}
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
  useLocale,
  weekStartOf,
} from '@numior/primitives';
import NuiButton from '../button/NuiButton.vue';
import NuiCalendarMonth from './NuiCalendarMonth.vue';
import { provideCalendar, type RequestOptions } from './calendar-context';
import type { NuiCalendarProps, NuiCalendarValue, NuiDatePreset } from './calendar.types';
import { dayStateOf, selectedDatesOf } from './day-state';
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
  previousLabel = 'Previous month',
  nextLabel = 'Next month',
  monthLabel = 'Choose month',
  yearLabel = 'Choose year',
  todayLabel = 'Today',
  weekLabel = 'Week',
} = defineProps<NuiCalendarProps>();

const model = defineModel<NuiCalendarValue>({ default: null });
const monthModel = defineModel<string>('month');

const baseId = useControlId(() => id);
const root = useTemplateRef<HTMLElement>('root');
const locale = useLocale(() => localeProp);
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

const { view, month, visibleMonths, yearPage, slide, setMonth, setView, shift } = calendarView;

const selection = useCalendarSelection({
  model,
  mode: () => mode,
  today: () => todayDate.value,
});

const focused = ref(initialDate());
const pending = ref(false);
const lastPick = ref<NuiCalendarValue>(model.value);

const isDisabled = (date: string): boolean =>
  !isWithin(date, min, max) || (isDateDisabled?.(date) ?? false);

const isRtl = (): boolean => root.value?.closest('[dir]')?.getAttribute('dir') === 'rtl';

const reveal = (key: string): void => {
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
  pending.value = options.focus ?? true;
};

const settle = (): void => {
  if (!pending.value || view.value !== 'days') {
    return;
  }

  const button = root.value?.querySelector(`time[datetime="${focused.value}"]`)?.closest('button');

  if (button instanceof HTMLButtonElement) {
    pending.value = false;
    button.focus({ preventScroll: true });
  }
};

const pick = (date: string): void => {
  selection.pick(date);
  lastPick.value = model.value;
  request(date);
};

const click = (date: string): void => {
  selection.click(date);
  lastPick.value = model.value;
  request(date);
};

const pickMonth = (key: string): void => {
  const day = Number(focused.value.slice(8, 10));
  const year = Number(key.slice(0, 4));
  const monthNumber = Number(key.slice(5, 7));

  setView('days');

  request(
    formatIsoDate({ year, month: monthNumber, day: Math.min(day, daysInMonth(year, monthNumber)) }),
  );
};

const pickYear = (year: number): void => {
  setMonth(`${String(year).padStart(4, '0')}-${month.value.slice(5, 7)}`);
  setView('months');
};

const goToday = (): void => {
  if (!todayDate.value) {
    return;
  }

  if (mode === 'single' && !isDisabled(todayDate.value)) {
    pick(todayDate.value);
  } else {
    setView('days');
    request(todayDate.value);
  }
};

const applyPreset = (preset: NuiDatePreset): void => {
  const range = selection.resolvePreset(preset);

  model.value = range;
  lastPick.value = range;

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
    previous: previousLabel,
    next: nextLabel,
    month: monthLabel,
    year: yearLabel,
    week: weekLabel,
  }),
  view,
  month,
  yearPage,
  slide,
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
  shift,
  setView,
  pickMonth,
  pickYear,
  request,
  click,
  hover: (date) => {
    selection.hovered.value = date;
  },
  arm: (date) => {
    selection.arm(date);
    lastPick.value = model.value;
  },
  release: (date) => {
    selection.release(date);
    lastPick.value = model.value;
  },
});

onMounted(() => {
  mounted.value = true;
  watch([focused, month, view], settle, { flush: 'post' });

  watch(model, (value) => {
    if (value === lastPick.value) {
      return;
    }

    const first = selectedDatesOf(value)[0];

    if (first) {
      request(first, { focus: false });
    }
  });
});

defineExpose({ focus: (date?: string) => request(date ?? focused.value) });
</script>
