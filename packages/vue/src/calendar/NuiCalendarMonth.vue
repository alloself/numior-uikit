<template>
  <section class="nui-calendar__month" :aria-labelledby="captionId">
    <NuiCalendarCaption :month="month" :caption-id="captionId" :first="first" :last="last" />
    <table
      v-if="calendar.view.value === 'days'"
      :key="month"
      role="grid"
      class="nui-calendar__grid"
      :class="slideClass"
      :aria-multiselectable="calendar.mode() !== 'single' || undefined"
      @keydown="onGridKeydown"
    >
      <thead>
        <tr>
          <th v-if="calendar.weekNumbers()" scope="col" class="nui-calendar__week-head">
            <span class="nui-calendar__hidden">{{ labels.week }}</span>
          </th>
          <th
            v-for="(label, index) in weekdays"
            :key="index"
            scope="col"
            class="nui-calendar__weekday"
            :abbr="weekdayNames[index]"
          >
            {{ label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row[0]" class="nui-calendar__row">
          <th v-if="calendar.weekNumbers()" scope="row" class="nui-calendar__week">
            {{ formatDayNumber(weekNumberOfRow(row), calendar.locale.value) }}
          </th>
          <NuiCalendarDay v-for="date in row" :key="date" :date="date" :month="month" />
        </tr>
      </tbody>
    </table>
    <NuiCalendarPicker v-else :kind="calendar.view.value" />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  formatDayNumber,
  gridMoveFor,
  gridTargetDate,
  monthGrid,
  weekNumberOfRow,
  weekdayLabels,
} from '@numior/primitives';
import NuiCalendarCaption from './NuiCalendarCaption.vue';
import NuiCalendarDay from './NuiCalendarDay.vue';
import NuiCalendarPicker from './NuiCalendarPicker.vue';
import { useCalendar } from './calendar-context';

const { month, first, last } = defineProps<{ month: string; first: boolean; last: boolean }>();

const calendar = useCalendar();
const labels = computed(() => calendar.labels());
const captionId = computed(() => `${calendar.id.value}-${month}-caption`);
const weekdays = computed(() => weekdayLabels(calendar.locale.value, calendar.weekStart.value));

const weekdayNames = computed(() =>
  weekdayLabels(calendar.locale.value, calendar.weekStart.value, 'long'),
);

const rows = computed(() =>
  monthGrid({ month, weekStart: calendar.weekStart.value, fixedWeeks: calendar.fixedWeeks() }),
);

const slideClass = computed(() =>
  calendar.slide.value === undefined
    ? undefined
    : `nui-calendar__grid--slide-${calendar.slide.value}`,
);

const onGridKeydown = (event: KeyboardEvent): void => {
  const move = gridMoveFor(event.key, event.shiftKey, calendar.isRtl());

  if (!move) {
    return;
  }

  event.preventDefault();
  calendar.request(gridTargetDate(move, calendar.focused.value, calendar.weekStart.value));
};
</script>
