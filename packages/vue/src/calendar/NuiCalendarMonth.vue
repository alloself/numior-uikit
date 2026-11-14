<template>
  <section class="nui-calendar__month" :aria-labelledby="captionId">
    <NuiCalendarCaption :month="month" :caption-id="captionId" :first="first" :last="last" />
    <table
      v-if="calendar.view.value === NuiCalendarView.Days"
      :key="month"
      role="grid"
      class="nui-calendar__grid"
      :class="slideClass"
      :aria-multiselectable="calendar.mode() !== NuiCalendarMode.Single || undefined"
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
        <NuiCalendarWeek v-for="(row, week) in rows" :key="week" :row="row" :month="month" />
      </tbody>
    </table>
    <NuiCalendarPicker v-else :kind="calendar.view.value" :month="month" />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { gridMoveFor, gridTargetDate, monthGrid, weekdayLabels } from '@numior/primitives';
import NuiCalendarCaption from './NuiCalendarCaption.vue';
import NuiCalendarPicker from './NuiCalendarPicker.vue';
import NuiCalendarWeek from './NuiCalendarWeek.vue';
import { useCalendar } from './calendar-context';
import { NuiCalendarMode, NuiCalendarView } from './calendar.types';

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

const dateOfTarget = (target: EventTarget | null): string | undefined =>
  target instanceof Element
    ? (target.closest('.nui-calendar__day')?.querySelector('time')?.getAttribute('datetime') ??
      undefined)
    : undefined;

const onGridKeydown = (event: KeyboardEvent): void => {
  const move = gridMoveFor(event.key, event.shiftKey, calendar.isRtl());

  if (!move) {
    return;
  }

  event.preventDefault();
  const origin = dateOfTarget(event.target) ?? calendar.focused.value;

  calendar.request(gridTargetDate(move, origin, calendar.weekStart.value));
};
</script>
