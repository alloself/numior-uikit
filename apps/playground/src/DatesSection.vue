<template>
  <section class="panel" aria-labelledby="dates-title">
    <div class="section-heading">
      <h2 id="dates-title">Даты</h2>
      <span class="tag">NuiCalendar · NuiDatePicker · NuiDateRangePicker</span>
    </div>
    <div class="form">
      <NuiField label="Дата поездки" description="Введите или выберите в календаре">
        <NuiDatePicker v-model="picked" clearable data-testid="date-picker" />
      </NuiField>
      <NuiField label="Период отчёта" description="Два месяца и пресеты">
        <NuiDateRangePicker
          v-model="period"
          :presets="presets"
          clearable
          end-label="Конец периода"
          data-testid="date-range-picker"
        />
      </NuiField>
      <NuiField label="Встреча" description="Дата и время">
        <NuiDatePicker v-model="moment" time :time-step="30" data-testid="date-time-picker" />
      </NuiField>
      <NuiField label="Дата доставки" description="Календарь открывается щелчком по полю">
        <NuiDatePicker v-model="delivery" open-on-click data-testid="date-picker-click" />
      </NuiField>
    </div>
    <div class="dates-grid">
      <NuiCalendar
        v-model="date"
        v-model:month="month"
        week-numbers
        min="2026-09-02"
        max="2026-12-31"
        :is-date-disabled="isWeekend"
        previous-label="Предыдущий месяц"
        next-label="Следующий месяц"
        month-label="Выбрать месяц"
        year-label="Выбрать год"
        today-label="Сегодня"
        week-label="Неделя"
        data-testid="date-calendar"
      />
      <NuiCalendar
        v-model="dates"
        mode="multiple"
        size="sm"
        previous-label="Предыдущий месяц"
        next-label="Следующий месяц"
        month-label="Выбрать месяц"
        year-label="Выбрать год"
        today-label="Сегодня"
        data-testid="date-multiple"
      />
      <NuiCalendar
        v-model="range"
        mode="range"
        :months="2"
        :presets="presets"
        previous-label="Предыдущий месяц"
        next-label="Следующий месяц"
        month-label="Выбрать месяц"
        year-label="Выбрать год"
        today-label="Сегодня"
        class="dates-range"
        data-testid="date-range"
      />
    </div>
    <pre class="output" data-testid="dates-output">{{ output }}</pre>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  NuiCalendar,
  NuiDatePicker,
  NuiDateRangePicker,
  NuiField,
  addDays,
  localToday,
  startOfMonth,
  weekdayOf,
  type NuiDatePreset,
  type NuiDateRange,
} from '@numior/vue';

const isWeekend = (value: string): boolean => weekdayOf(value) >= 6;

const presets: NuiDatePreset[] = [
  { label: 'Сегодня', range: (today) => ({ start: today, end: today }) },
  { label: 'Последние 7 дней', range: (today) => ({ start: addDays(today, -6), end: today }) },
  { label: 'Этот месяц', range: (today) => ({ start: startOfMonth(today), end: today }) },
];

const date = ref<string | null>('2026-09-24');
const month = ref<string>();
const dates = ref<string[]>(['2026-09-03', '2026-09-10']);
const range = ref<NuiDateRange>({ start: null, end: null });
const picked = ref<string | null>(null);
const period = ref<NuiDateRange>({ start: null, end: null });
const moment = ref<string | null>('2026-09-24T09:30');
const delivery = ref<string | null>(null);

const output = computed(() =>
  JSON.stringify(
    {
      date: date.value,
      month: month.value ?? null,
      dates: dates.value,
      range: range.value,
      picked: picked.value,
      period: period.value,
      moment: moment.value,
      delivery: delivery.value,
      today: localToday(),
    },
    null,
    2,
  ),
);
</script>
